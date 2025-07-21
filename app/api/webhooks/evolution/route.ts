import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { evolutionAPI, EvolutionWebhookPayload } from '@/lib/evolution-api'
import crypto from 'crypto-js'

// Endpoint para receber webhooks da Evolution API
export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionWebhookPayload = await request.json()
    
    // Log do webhook recebido
    console.log('📩 Webhook Evolution API recebido:', {
      event: payload.event,
      instance: payload.instance,
      timestamp: payload.date_time,
      remoteJid: payload.data?.key?.remoteJid
    })

    // Salvar log do webhook
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        source: 'evolution',
        event_type: payload.event,
        payload: payload,
        processed: false
      })

    // Processar diferentes tipos de eventos
    switch (payload.event) {
      case 'messages.upsert':
        await processMessageUpsert(payload)
        break
      
      case 'connection.update':
        await processConnectionUpdate(payload)
        break
        
      default:
        console.log(`ℹ️ Evento não processado: ${payload.event}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event: payload.event 
    })

  } catch (error) {
    console.error('❌ Erro no webhook Evolution:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Processar mensagens (evento principal)
async function processMessageUpsert(payload: EvolutionWebhookPayload) {
  try {
    const { data } = payload
    const { key, message, pushName, messageTimestamp } = data

    if (!key?.remoteJid) {
      console.warn('⚠️ remoteJid não encontrado no payload')
      return
    }

    // Extrair número do telefone
    const phone = evolutionAPI.extractPhoneFromJid(key.remoteJid)
    
    // Buscar ou criar contato
    let contact = await findOrCreateContact(phone, pushName)
    
    // Buscar ou criar conversa
    let conversation = await findOrCreateConversation(contact.id, key.remoteJid)
    
    // Extrair conteúdo da mensagem
    const messageContent = extractMessageContent(message)
    const messageType = getMessageType(message)
    
    // Salvar mensagem
    await saveMessage({
      id: key.id,
      conversation_id: conversation.id,
      contact_id: contact.id,
      content: messageContent,
      message_type: messageType,
      from_me: key.fromMe,
      status: 'received',
      timestamp: new Date(messageTimestamp * 1000).toISOString(),
      metadata: {
        pushName,
        originalPayload: message
      }
    })

    console.log('✅ Mensagem processada:', {
      contact: pushName || phone,
      content: messageContent?.substring(0, 50) + '...',
      fromMe: key.fromMe
    })

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error)
    throw error
  }
}

// Buscar ou criar contato
async function findOrCreateContact(phone: string, pushName?: string) {
  try {
    // Tentar buscar contato existente
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single()

    if (existingContact) {
      // Atualizar nome se necessário
      if (pushName && pushName !== existingContact.push_name) {
        const { data: updatedContact } = await supabaseAdmin
          .from('contacts')
          .update({ 
            push_name: pushName,
            name: pushName, // Usar pushName como nome padrão
            last_seen: new Date().toISOString()
          })
          .eq('id', existingContact.id)
          .select()
          .single()
        
        return updatedContact
      }
      
      return existingContact
    }

    // Criar novo contato
    const { data: newContact, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        phone,
        name: pushName,
        push_name: pushName,
        last_seen: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    
    console.log('👤 Novo contato criado:', { phone, name: pushName })
    return newContact

  } catch (error) {
    console.error('❌ Erro ao buscar/criar contato:', error)
    throw error
  }
}

// Buscar ou criar conversa
async function findOrCreateConversation(contactId: string, remoteJid: string) {
  try {
    // Tentar buscar conversa existente
    const { data: existingConversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('remote_jid', remoteJid)
      .single()

    if (existingConversation) {
      return existingConversation
    }

    // Criar nova conversa
    const { data: newConversation, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        contact_id: contactId,
        remote_jid: remoteJid,
        status: 'active',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    
    console.log('💬 Nova conversa criada:', { remoteJid, contactId })
    return newConversation

  } catch (error) {
    console.error('❌ Erro ao buscar/criar conversa:', error)
    throw error
  }
}

// Salvar mensagem
async function saveMessage(messageData: any) {
  try {
    const { error } = await supabaseAdmin
      .from('messages')
      .upsert(messageData, {
        onConflict: 'id'
      })

    if (error) throw error

  } catch (error) {
    console.error('❌ Erro ao salvar mensagem:', error)
    throw error
  }
}

// Extrair conteúdo da mensagem
function extractMessageContent(message: any): string | null {
  if (message.conversation) {
    return message.conversation
  }
  
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text
  }
  
  if (message.imageMessage) {
    return '[Imagem]'
  }
  
  if (message.audioMessage) {
    return '[Áudio]'
  }
  
  if (message.videoMessage) {
    return '[Vídeo]'
  }
  
  if (message.documentMessage) {
    return `[Documento: ${message.documentMessage.fileName || 'arquivo'}]`
  }
  
  return '[Mensagem não suportada]'
}

// Determinar tipo da mensagem
function getMessageType(message: any): string {
  if (message.conversation) return 'text'
  if (message.extendedTextMessage) return 'text'
  if (message.imageMessage) return 'image'
  if (message.audioMessage) return 'audio'
  if (message.videoMessage) return 'video'
  if (message.documentMessage) return 'document'
  
  return 'unknown'
}

// Processar atualizações de conexão
async function processConnectionUpdate(payload: EvolutionWebhookPayload) {
  console.log('🔗 Atualização de conexão:', payload.data)
  // Implementar lógica específica se necessário
}

// Endpoint GET para verificar status
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhooks/evolution',
    description: 'Endpoint para receber webhooks da Evolution API',
    timestamp: new Date().toISOString()
  })
} 