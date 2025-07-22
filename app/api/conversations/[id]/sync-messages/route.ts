import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI } from '@/lib/evolution-api'
import { supabaseAdmin } from '@/lib/supabase'

// Interface para tipagem da resposta do Supabase
interface ConversationWithContact {
  id: string
  remote_jid: string
  contact: {
    id: string
    phone: string
    name: string
  } | {
    id: string
    phone: string
    name: string
  }[] | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id

    console.log(`🔄 Sincronizando mensagens da conversa: ${conversationId}`)

    // Buscar dados da conversa
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        remote_jid,
        contact:contacts(id, phone, name)
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Tipar a conversa para evitar erros do TypeScript
    const typedConversation = conversation as ConversationWithContact

    const remoteJid = typedConversation.remote_jid
    
    // Buscar mensagens desta conversa na Evolution API
    console.log(`📱 Buscando mensagens da Evolution API para: ${remoteJid}`)
    
    // Buscar mensagens de múltiplas formas para garantir que pegamos todas
    let messages: any[] = []
    
    try {
      // Método 1: Buscar por remoteJid específico
      const method1 = await evolutionAPI.findMessages({
        where: {
          key: {
            remoteJid: remoteJid
          }
        },
        limit: 500
      })
      
      if (method1 && method1.length > 0) {
        messages = messages.concat(method1)
      }
      
      // Método 2: Buscar sem filtros específicos (todas as mensagens)
      if (messages.length === 0) {
        console.log(`🔄 Tentando buscar todas as mensagens e filtrar localmente...`)
        const allMessages = await evolutionAPI.findMessages({
          limit: 1000
        })
        
        // Filtrar mensagens que correspondem ao remoteJid
        const filteredMessages = allMessages.filter((msg: any) => 
          msg.key?.remoteJid === remoteJid ||
          msg.key?.remoteJid === remoteJid.replace('@s.whatsapp.net', '@c.us') ||
          msg.key?.remoteJid === remoteJid.replace('@c.us', '@s.whatsapp.net')
        )
        
        messages = messages.concat(filteredMessages)
      }
      
      // Remover duplicatas baseado no ID
      messages = messages.filter((msg, index, arr) => 
        arr.findIndex(m => m.key?.id === msg.key?.id) === index
      )
      
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens da Evolution API:', error)
      messages = []
    }

    console.log(`📩 Encontradas ${messages.length} mensagens na Evolution API`)

    let syncedCount = 0
    let errorCount = 0

    // Obter ID do contato de forma mais robusta
    let contactId: string | undefined
    
    if (Array.isArray(typedConversation.contact)) {
      contactId = typedConversation.contact[0]?.id
    } else if (typedConversation.contact && typeof typedConversation.contact === 'object') {
      contactId = typedConversation.contact.id
    }

    if (!contactId) {
      console.error('❌ Contact ID não encontrado:', typedConversation.contact)
      return NextResponse.json(
        { success: false, error: 'Contato não encontrado na conversa' },
        { status: 404 }
      )
    }

    // Processar cada mensagem
    for (const message of messages) {
      try {
        // Validar se a mensagem tem os dados necessários
        if (!message.key?.id || !message.messageTimestamp) {
          console.warn('⚠️ Mensagem sem dados essenciais, pulando:', message.key?.id)
          continue
        }
        
        // Extrair conteúdo da mensagem
        let content = '[Mensagem sem conteúdo]'
        
        if (message.message?.conversation) {
          content = message.message.conversation
        } else if (message.message?.extendedTextMessage?.text) {
          content = message.message.extendedTextMessage.text
        } else if (message.message?.imageMessage?.caption) {
          content = message.message.imageMessage.caption || '[Imagem]'
        } else if (message.message?.imageMessage) {
          content = '[Imagem]'
        } else if (message.message?.videoMessage) {
          content = '[Vídeo]'
        } else if (message.message?.audioMessage) {
          content = '[Áudio]'
        } else if (message.message?.documentMessage) {
          content = '[Documento]'
        } else if (message.message?.stickerMessage) {
          content = '[Sticker]'
        }

        const messageData = {
          id: message.key.id,
          conversation_id: conversationId,
          contact_id: contactId,
          content: content,
          message_type: getMessageType(message),
          from_me: Boolean(message.key.fromMe),
          status: message.status || 'received',
          timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
          media_url: message.message?.imageMessage?.url || message.message?.videoMessage?.url || null,
          metadata: { 
            originalMessage: message,
            syncTimestamp: new Date().toISOString()
          }
        }

        console.log(`💾 Salvando mensagem: ${messageData.id} - ${messageData.content.substring(0, 50)}... - from_me: ${messageData.from_me}`)

         // Salvar/atualizar mensagem no banco
         const { error: msgError } = await supabaseAdmin
           .from('messages')
           .upsert(messageData, {
             onConflict: 'id'
           })

        if (msgError) {
          console.error('❌ Erro ao salvar mensagem:', msgError, messageData)
          errorCount++
        } else {
          syncedCount++
          console.log(`✅ Mensagem salva: ${messageData.id}`)
        }

      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error, message.key?.id)
        errorCount++
      }
    }

    // Atualizar contador de mensagens na conversa
    await supabaseAdmin
      .from('conversations')
      .update({
        messages_count: syncedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    console.log(`✅ Sincronização concluída: ${syncedCount} mensagens sincronizadas, ${errorCount} erros`)

    // Obter dados do contato de forma mais robusta
    let contactData: { id: string; phone: string; name: string } | null = null
    
    if (Array.isArray(typedConversation.contact)) {
      contactData = typedConversation.contact[0] || null
    } else if (typedConversation.contact && typeof typedConversation.contact === 'object') {
      contactData = typedConversation.contact
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: messages.length,
      conversation: {
        id: conversationId,
        contact: contactData?.name || 'Nome não disponível',
        phone: contactData?.phone || 'Telefone não disponível'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro na sincronização de mensagens:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Determinar tipo da mensagem
function getMessageType(message: any): string {
  if (message.message?.conversation) return 'text'
  if (message.message?.extendedTextMessage) return 'text'
  if (message.message?.imageMessage) return 'image'
  if (message.message?.videoMessage) return 'video'
  if (message.message?.audioMessage) return 'audio'
  if (message.message?.documentMessage) return 'document'
  if (message.message?.stickerMessage) return 'sticker'
  return 'unknown'
} 