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
        // Verificar se contact e contact.id existem
        if (!contact || !contact.id) {
          console.warn('⚠️ Contato inválido encontrado, pulando...')
          continue
        }

        // Buscar ou criar contato no banco
        const phone = contact.id.replace('@s.whatsapp.net', '').replace('@c.us', '')
        
        await supabaseAdmin
          .from('contacts')
          .upsert({
            phone,
            name: contact.pushName || 'Nome não disponível',
            push_name: contact.pushName || 'Nome não disponível',
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
  const logs: string[] = []
  
  try {
    logs.push('🔄 Iniciando sincronização de chats...')
    console.log('🔄 Iniciando sincronização de chats...')
    
    const chats = await evolutionAPI.syncAllChats()
    logs.push(`📊 Total de chats recebidos: ${chats.length}`)
    console.log(`📊 Total de chats recebidos: ${chats.length}`)
    
    let processedCount = 0
    let errorCount = 0
    
    for (const [index, chat] of chats.entries()) {
      try {
        const chatLog = `🔍 Processando chat ${index + 1}/${chats.length}: ${JSON.stringify({
          id: chat.id,
          name: chat.name,
          isGroup: chat.isGroup,
          lastMessageTimestamp: chat.lastMessageTimestamp
        })}`
        
        logs.push(chatLog)
        console.log(chatLog)
        
        // Verificar se chat.id existe
        if (!chat.id) {
          const warnMsg = '⚠️ Chat sem ID: ' + JSON.stringify(chat)
          logs.push(warnMsg)
          console.warn(warnMsg)
          continue
        }
        
        // Pular grupos por enquanto (focar em conversas individuais)
        if (chat.isGroup) {
          const groupMsg = `📝 Pulando grupo: ${chat.name || chat.id}`
          logs.push(groupMsg)
          console.log(groupMsg)
          continue
        }
        
        // Extrair telefone do chat ID
        const phone = evolutionAPI.extractPhoneFromJid(chat.id)
        const phoneMsg = `📞 Telefone extraído: "${phone}" do JID: "${chat.id}"`
        logs.push(phoneMsg)
        console.log(phoneMsg)
        
        // Verificar se conseguiu extrair o telefone
        if (!phone || phone.length < 8) {
          const phoneWarn = `⚠️ Telefone inválido extraído: ${JSON.stringify({ phone, jid: chat.id })}`
          logs.push(phoneWarn)
          console.warn(phoneWarn)
          continue
        }
        
        // Buscar contato
        const searchMsg = `🔍 Buscando contato com telefone: "${phone}"`
        logs.push(searchMsg)
        console.log(searchMsg)
        
        let { data: contact, error: contactError } = await supabaseAdmin
          .from('contacts')
          .select('id, phone, name')
          .eq('phone', phone)
          .single()
        
        if (contactError && contactError.code !== 'PGRST116') {
          const contactErrorMsg = `❌ Erro ao buscar contato: ${contactError.message}`
          logs.push(contactErrorMsg)
          console.error(contactErrorMsg)
        }
        
        // Se não encontrou o contato, tentar criar um básico
        if (!contact) {
          const createMsg = `📝 Contato não encontrado, criando contato básico para: ${phone}`
          logs.push(createMsg)
          console.log(createMsg)
          
          const { data: newContact, error: createError } = await supabaseAdmin
            .from('contacts')
            .upsert({
              phone,
              name: chat.name || `Contato ${phone}`,
              push_name: chat.name || `Contato ${phone}`,
              last_seen: new Date().toISOString()
            }, {
              onConflict: 'phone'
            })
            .select('id, phone, name')
            .single()
          
          if (createError) {
            const createErrorMsg = `❌ Erro ao criar contato: ${createError.message}`
            logs.push(createErrorMsg)
            console.error(createErrorMsg)
            errorCount++
            continue
          }
          
          contact = newContact
          const createdMsg = `✅ Contato criado: ${JSON.stringify(contact)}`
          logs.push(createdMsg)
          console.log(createdMsg)
        } else {
          const foundMsg = `✅ Contato encontrado: ${JSON.stringify(contact)}`
          logs.push(foundMsg)
          console.log(foundMsg)
        }
        
        if (contact && contact.id) {
          // Criar ou atualizar conversa
          const convMsg = `💬 Criando/atualizando conversa para contato ID: ${contact.id}`
          logs.push(convMsg)
          console.log(convMsg)
          
          const lastMessageAt = chat.lastMessageTimestamp 
            ? new Date(chat.lastMessageTimestamp * 1000).toISOString()
            : new Date().toISOString()
          
          const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .upsert({
              contact_id: contact.id,
              remote_jid: chat.id,
              status: chat.archived ? 'archived' : 'active',
              last_message_at: lastMessageAt,
              messages_count: 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'remote_jid'
            })
            .select('id')
            .single()
          
          if (convError) {
            const convErrorMsg = `❌ Erro ao criar conversa: ${convError.message}`
            logs.push(convErrorMsg)
            console.error(convErrorMsg)
            errorCount++
          } else {
            const convSuccessMsg = `✅ Conversa criada/atualizada: ${JSON.stringify(conversation)}`
            logs.push(convSuccessMsg)
            console.log(convSuccessMsg)
            processedCount++
          }
        } else {
          const contactIdErrorMsg = `❌ Erro: Contato sem ID válido: ${JSON.stringify(contact)}`
          logs.push(contactIdErrorMsg)
          console.error(contactIdErrorMsg)
          errorCount++
        }
        
      } catch (error) {
        const chatErrorMsg = `❌ Erro ao processar chat: ${error instanceof Error ? error.message : String(error)}`
        logs.push(chatErrorMsg)
        console.error(chatErrorMsg)
        errorCount++
      }
    }
    
    const resultMsg = `📊 Resultado da sincronização de chats: Total: ${chats.length}, Processados: ${processedCount}, Erros: ${errorCount}`
    logs.push(resultMsg)
    console.log(resultMsg)
    
    return {
      total: chats.length,
      processed: processedCount,
      errors: errorCount,
      logs: logs  // ← Retornar logs para debug
    }
    
  } catch (error) {
    const errorMsg = `❌ Erro ao sincronizar chats: ${error instanceof Error ? error.message : String(error)}`
    logs.push(errorMsg)
    console.error(errorMsg)
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

    // Verificar se contact foi criado com sucesso
    if (!contact) {
      console.error('❌ Erro: Não foi possível criar ou encontrar contato para:', phone)
      return
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
    
    // Verificar se conversation foi criada com sucesso
    if (!conversation) {
      console.error('❌ Erro: Não foi possível criar ou encontrar conversa para:', message.key.remoteJid)
      return
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