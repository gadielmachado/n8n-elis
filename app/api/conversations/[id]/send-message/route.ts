import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI } from '@/lib/evolution-api'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id
    const { message, messageType = 'text' } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    console.log(`📤 Enviando mensagem para conversa: ${conversationId}`)

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

    const remoteJid = conversation.remote_jid

    // Enviar mensagem via Evolution API
    const sentMessage = await evolutionAPI.sendTextMessage(remoteJid, message)

    console.log(`✅ Mensagem enviada via Evolution API:`, sentMessage)

    // Salvar mensagem no banco de dados
    const messageId = sentMessage.key?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Obter ID do contato
    let contactId: string | undefined
    if (Array.isArray(conversation.contact)) {
      contactId = conversation.contact[0]?.id
    } else if (conversation.contact && typeof conversation.contact === 'object') {
      contactId = (conversation.contact as any).id
    }

    if (contactId) {
      const { error: saveError } = await supabaseAdmin
        .from('messages')
        .insert({
          id: messageId,
          conversation_id: conversationId,
          contact_id: contactId,
          content: message,
          message_type: messageType,
          from_me: true,
          status: 'sent',
          timestamp: new Date().toISOString(),
          metadata: { 
            evolutionResponse: sentMessage,
            sentViaInterface: true 
          }
        })

      if (saveError) {
        console.error('❌ Erro ao salvar mensagem no banco:', saveError)
        // Não retornar erro aqui, pois a mensagem foi enviada com sucesso
      } else {
        console.log('✅ Mensagem salva no banco de dados')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: {
        messageId,
        remoteJid,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error)
    
    // Verificar se é erro específico da Evolution API
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Contato não encontrado ou inativo' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { success: false, error: 'Erro de autenticação com Evolution API' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 