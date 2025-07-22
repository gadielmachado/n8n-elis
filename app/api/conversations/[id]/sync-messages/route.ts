import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI } from '@/lib/evolution-api'
import { supabaseAdmin } from '@/lib/supabase'

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
        contact:contacts(phone, name)
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    const remoteJid = conversation.remote_jid
    
    // Buscar mensagens desta conversa na Evolution API
    console.log(`📱 Buscando mensagens da Evolution API para: ${remoteJid}`)
    
    const messages = await evolutionAPI.findMessages({
      where: {
        key: {
          remoteJid: remoteJid
        }
      },
      limit: 100
    })

    console.log(`📩 Encontradas ${messages.length} mensagens na Evolution API`)

    let syncedCount = 0
    let errorCount = 0

    // Processar cada mensagem
    for (const message of messages) {
      try {
        // Extrair conteúdo da mensagem
        const content = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text ||
                       message.message?.imageMessage?.caption ||
                       '[Mídia]'

        // Salvar/atualizar mensagem no banco
        const { error: msgError } = await supabaseAdmin
          .from('messages')
          .upsert({
            id: message.key.id,
            conversation_id: conversationId,
            contact_id: conversation.contact.id,
            content: content,
            message_type: getMessageType(message),
            from_me: message.key.fromMe,
            status: message.status || 'received',
            timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
            media_url: message.message?.imageMessage?.url || message.message?.videoMessage?.url || null,
            metadata: { originalMessage: message }
          }, {
            onConflict: 'id'
          })

        if (msgError) {
          console.error('❌ Erro ao salvar mensagem:', msgError)
          errorCount++
        } else {
          syncedCount++
        }

      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error)
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

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: messages.length,
      conversation: {
        id: conversationId,
        contact: conversation.contact.name,
        phone: conversation.contact.phone
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