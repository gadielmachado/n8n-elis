import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI } from '@/lib/evolution-api'
import { supabaseAdmin } from '@/lib/supabase'

// Endpoint para sincronização manual de dados
export async function POST(request: NextRequest) {
  try {
    const { type, limit } = await request.json()
    
    console.log(`🔄 Iniciando sincronização: ${type}`)
    
    let result: any = {}
    
    switch (type) {
      case 'messages':
        result = await syncMessages(limit || 100)
        break
        
      case 'contacts':
        result = await syncContacts()
        break
        
      case 'chats':
        result = await syncChats()
        break
        
      case 'all':
        result = await syncAll(limit)
        break
        
      default:
        throw new Error(`Tipo de sincronização inválido: ${type}`)
    }
    
    // Recalcular métricas após sincronização
    await recalculateMetrics()
    
    return NextResponse.json({
      success: true,
      message: `Sincronização de ${type} concluída com sucesso`,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro na sincronização',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Sincronizar mensagens
async function syncMessages(limit: number = 100) {
  try {
    const messages = await evolutionAPI.syncAllMessages(limit)
    let processedCount = 0
    let errorCount = 0
    
    for (const message of messages) {
      try {
        // Processar cada mensagem
        await processEvolutionMessage(message)
        processedCount++
      } catch (error) {
        console.error('Erro ao processar mensagem:', error)
        errorCount++
      }
    }
    
    return {
      total: messages.length,
      processed: processedCount,
      errors: errorCount
    }
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar mensagens:', error)
    throw error
  }
}

// Sincronizar contatos
async function syncContacts() {
  try {
    const contacts = await evolutionAPI.syncAllContacts()
    let processedCount = 0
    
    for (const contact of contacts) {
      try {
        // Buscar ou criar contato no banco
        const phone = contact.id.replace('@s.whatsapp.net', '').replace('@c.us', '')
        
        await supabaseAdmin
          .from('contacts')
          .upsert({
            phone,
            name: contact.pushName,
            push_name: contact.pushName,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'phone'
          })
        
        processedCount++
      } catch (error) {
        console.error('Erro ao processar contato:', error)
      }
    }
    
    return {
      total: contacts.length,
      processed: processedCount
    }
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar contatos:', error)
    throw error
  }
}

// Sincronizar chats
async function syncChats() {
  try {
    const chats = await evolutionAPI.syncAllChats()
    let processedCount = 0
    
    for (const chat of chats) {
      try {
        // Verificar se chat.id existe
        if (!chat.id) {
          console.warn('⚠️ Chat sem ID:', chat)
          continue
        }
        
        // Extrair telefone do chat ID
        const phone = evolutionAPI.extractPhoneFromJid(chat.id)
        
        // Verificar se conseguiu extrair o telefone
        if (!phone) {
          console.warn('⚠️ Não foi possível extrair telefone do chat:', chat.id)
          continue
        }
        
        // Buscar ou criar contato
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .eq('phone', phone)
          .single()
        
        if (contact) {
          // Criar ou atualizar conversa
          await supabaseAdmin
            .from('conversations')
            .upsert({
              contact_id: contact.id,
              remote_jid: chat.id,
              status: chat.archived ? 'archived' : 'active',
              last_message_at: new Date(chat.lastMessageTimestamp * 1000).toISOString()
            }, {
              onConflict: 'remote_jid'
            })
          
          processedCount++
        }
      } catch (error) {
        console.error('Erro ao processar chat:', error)
      }
    }
    
    return {
      total: chats.length,
      processed: processedCount
    }
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar chats:', error)
    throw error
  }
}

// Sincronizar tudo
async function syncAll(limit?: number) {
  try {
    const results = {
      contacts: await syncContacts(),
      chats: await syncChats(),
      messages: await syncMessages(limit || 500)
    }
    
    return results
    
  } catch (error) {
    console.error('❌ Erro na sincronização completa:', error)
    throw error
  }
}

// Processar mensagem da Evolution API
async function processEvolutionMessage(message: any) {
  try {
    // Verificar se a mensagem tem a estrutura necessária
    if (!message.key || !message.key.remoteJid) {
      console.warn('⚠️ Mensagem sem remoteJid:', message)
      return
    }
    
    const phone = evolutionAPI.extractPhoneFromJid(message.key.remoteJid)
    
    // Verificar se conseguiu extrair o telefone
    if (!phone) {
      console.warn('⚠️ Não foi possível extrair telefone da mensagem:', message.key.remoteJid)
      return
    }
    
    // Buscar contato
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()
    
    // Criar contato se não existir
    if (!contact) {
      const { data: newContact } = await supabaseAdmin
        .from('contacts')
        .insert({
          phone,
          push_name: message.pushName,
          name: message.pushName
        })
        .select('id')
        .single()
      
      contact = newContact
    }
    
    // Buscar conversa
    let { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('remote_jid', message.key.remoteJid)
      .single()
    
    // Criar conversa se não existir
    if (!conversation) {
      const { data: newConversation } = await supabaseAdmin
        .from('conversations')
        .insert({
          contact_id: contact.id,
          remote_jid: message.key.remoteJid,
          status: 'active'
        })
        .select('id')
        .single()
      
      conversation = newConversation
    }
    
    // Extrair conteúdo da mensagem
    const content = message.message?.conversation || 
                   message.message?.extendedTextMessage?.text ||
                   '[Mídia]'
    
    // Salvar mensagem
    await supabaseAdmin
      .from('messages')
      .upsert({
        id: message.key.id,
        conversation_id: conversation.id,
        contact_id: contact.id,
        content,
        message_type: 'text',
        from_me: message.key.fromMe,
        status: message.status || 'received',
        timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
        metadata: { originalMessage: message }
      }, {
        onConflict: 'id'
      })
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem da Evolution:', error)
    throw error
  }
}

// Recalcular métricas
async function recalculateMetrics() {
  try {
    // Executar função SQL para recalcular métricas
    await supabaseAdmin.rpc('calculate_daily_metrics')
    
    console.log('📊 Métricas recalculadas com sucesso')
    
  } catch (error) {
    console.error('❌ Erro ao recalcular métricas:', error)
  }
}

// Endpoint GET para verificar status da sincronização
export async function GET() {
  try {
    // Verificar saúde da Evolution API
    const isHealthy = await evolutionAPI.healthCheck()
    
    // Buscar últimas sincronizações
    const { data: recentLogs } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .eq('source', 'evolution')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      status: 'online',
      evolution_api: {
        healthy: isHealthy,
        url: process.env.EVOLUTION_API_URL,
        instance: process.env.EVOLUTION_INSTANCE_NAME
      },
      recent_activity: recentLogs,
      available_sync_types: ['messages', 'contacts', 'chats', 'all'],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
} 