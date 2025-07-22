import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Conversation } from '@/types'

// GET - Buscar conversas com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('conversations')
      .select(`
        *,
        contact:contacts (
          id,
          phone,
          name,
          push_name,
          avatar_url,
          last_seen
        ),
        last_message:messages (
          id,
          content,
          timestamp,
          from_me,
          message_type
        )
      `)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por status se especificado
    if (status && status !== 'all') {
      const statusMap: { [key: string]: string } = {
        'initiated': 'active',
        'waiting': 'active', 
        'finished': 'archived'
      }
      query = query.eq('status', statusMap[status] || status)
    }

    const { data: conversations, error } = await query

    if (error) {
      throw error
    }

    // Processar conversas para o formato esperado pelo frontend
    const processedConversations: Conversation[] = await Promise.all(
      conversations?.map(async (conv: any) => {
        // Buscar última mensagem da conversa
        const { data: lastMessage } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        // Determinar status baseado na última mensagem
        let conversationStatus: 'initiated' | 'waiting' | 'finished' = 'initiated'
        
        if (lastMessage) {
          if (lastMessage.from_me) {
            conversationStatus = 'waiting' // Enviamos, aguardando resposta
          } else {
            conversationStatus = 'initiated' // Eles enviaram, conversa ativa
          }
        }

        if (conv.status === 'archived') {
          conversationStatus = 'finished'
        }

        return {
          id: conv.id,
          contact: {
            id: conv.contact.id,
            name: conv.contact.name || conv.contact.push_name || 'Sem nome',
            phone: conv.contact.phone,
            avatar: '👤' // Placeholder - implementar avatars depois
          },
          status: conversationStatus,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content || '[Mídia]',
            timestamp: new Date(lastMessage.timestamp).toISOString(),
            fromContact: !lastMessage.from_me,
            read: true
          } : {
            id: '',
            content: 'Sem mensagens',
            timestamp: new Date(conv.created_at).toISOString(),
            fromContact: false,
            read: true
          },
          messagesCount: conv.messages_count || 0,
          createdAt: new Date(conv.created_at).toISOString(),
          updatedAt: new Date(conv.updated_at).toISOString(),
          tags: [] // Implementar sistema de tags depois
        }
      }) || []
    )

    // Filtrar por busca se especificado
    let filteredConversations = processedConversations
    if (search) {
      const searchLower = search.toLowerCase()
      filteredConversations = processedConversations.filter(conv =>
        conv.contact.name.toLowerCase().includes(searchLower) ||
        conv.contact.phone.includes(search) ||
        conv.lastMessage.content.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      conversations: filteredConversations,
      total: filteredConversations.length,
      offset,
      limit
    })

  } catch (error) {
    console.error('❌ Erro ao buscar conversas:', error)
    
    return NextResponse.json(
      { error: 'Erro ao buscar conversas' },
      { status: 500 }
    )
  }
}

// POST - Criar nova conversa (se necessário)
export async function POST(request: NextRequest) {
  try {
    const { contactId, message } = await request.json()

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar contato
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já existe conversa para este contato
    const { data: existingConversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .single()

    if (existingConversation) {
      return NextResponse.json(
        { error: 'Conversa já existe para este contato' },
        { status: 409 }
      )
    }

    // Criar nova conversa
    const remoteJid = `${contact.phone}@s.whatsapp.net`
    
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

    if (error) {
      throw error
    }

    // Se uma mensagem foi fornecida, enviar via Evolution API
    if (message) {
      // Implementar envio de mensagem via Evolution API
      // await evolutionAPI.sendTextMessage(contact.phone, message)
    }

    return NextResponse.json({
      success: true,
      conversation: newConversation
    })

  } catch (error) {
    console.error('❌ Erro ao criar conversa:', error)
    
    return NextResponse.json(
      { error: 'Erro ao criar conversa' },
      { status: 500 }
    )
  }
} 