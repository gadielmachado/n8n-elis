import { NextRequest, NextResponse } from 'next/server'

// Endpoint para receber dados do n8n via webhook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Log dos dados recebidos (remover em produção)
    console.log('📩 Webhook n8n recebido:', {
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data, null, 2)
    })

    // Aqui você processaria os dados e salvaria no banco
    // Exemplo de estrutura esperada:
    /*
    {
      "contact": {
        "id": "string",
        "name": "string", 
        "phone": "string",
        "avatar": "string" (opcional)
      },
      "messages": [
        {
          "id": "string",
          "content": "string",
          "timestamp": "ISO date",
          "fromContact": boolean,
          "read": boolean
        }
      ],
      "status": "initiated" | "waiting" | "finished",
      "tags": ["string"] (opcional)
    }
    */

    // Validação básica
    if (!data.contact || !data.contact.name || !data.contact.phone) {
      return NextResponse.json(
        { error: 'Dados inválidos: contact.name e contact.phone são obrigatórios' },
        { status: 400 }
      )
    }

    // Simular processamento (substituir por lógica real)
    const processedData = {
      id: `conv_${Date.now()}`,
      contact: data.contact,
      status: data.status || 'initiated',
      lastMessage: data.messages?.[data.messages.length - 1] || {
        id: `msg_${Date.now()}`,
        content: 'Mensagem inicial',
        timestamp: new Date().toISOString(),
        fromContact: true,
        read: false
      },
      messagesCount: data.messages?.length || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: data.tags || []
    }

    // Aqui você salvaria no banco de dados
    // await saveConversation(processedData)

    return NextResponse.json({
      success: true,
      message: 'Conversa processada com sucesso',
      conversationId: processedData.id
    })

  } catch (error) {
    console.error('❌ Erro no webhook n8n:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar se a API está funcionando
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhooks/conversations',
    method: 'POST',
    description: 'Endpoint para receber dados de conversas do n8n',
    timestamp: new Date().toISOString()
  })
} 