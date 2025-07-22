import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id

    console.log(`🔍 Buscando mensagens da conversa: ${conversationId}`)

    // Buscar mensagens da conversa, ordenadas por timestamp
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        content,
        timestamp,
        from_me,
        message_type,
        media_url,
        quoted_message_id,
        conversation_id
      `)
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar mensagens' },
        { status: 500 }
      )
    }

    // Processar mensagens para o formato esperado pelo frontend
    const processedMessages = messages?.map((msg: any) => ({
      id: msg.id,
      content: msg.content || '[Mídia]',
      timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
      fromContact: !msg.from_me, // Invertido: from_me=true significa que enviamos
      read: true,
      messageType: msg.message_type || 'text',
      mediaUrl: msg.media_url || null,
      quotedMessageId: msg.quoted_message_id || null
    })) || []

    console.log(`✅ Encontradas ${processedMessages.length} mensagens`)

    return NextResponse.json({
      success: true,
      messages: processedMessages,
      count: processedMessages.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro na API de mensagens:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 