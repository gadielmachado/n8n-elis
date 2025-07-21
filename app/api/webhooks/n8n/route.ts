import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Endpoint para receber dados do n8n
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Log do webhook n8n
    console.log('📩 Webhook n8n recebido:', {
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload, null, 2)
    })

    // Salvar log do webhook
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        source: 'n8n',
        event_type: 'data_received',
        payload: payload,
        processed: false
      })

    // Processar dados do n8n
    await processN8nData(payload)

    return NextResponse.json({
      success: true,
      message: 'Dados do n8n processados com sucesso',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro no webhook n8n:', error)
    
    // Salvar erro no log
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        source: 'n8n',
        event_type: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        processed: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Processar dados do n8n
async function processN8nData(payload: any) {
  try {
    // Exemplo de processamento - adaptar conforme seu workflow n8n
    
    // Se o n8n está enviando dados de conversas processadas
    if (payload.conversations) {
      for (const conv of payload.conversations) {
        await processN8nConversation(conv)
      }
    }
    
    // Se o n8n está enviando métricas calculadas
    if (payload.metrics) {
      await processN8nMetrics(payload.metrics)
    }
    
    // Se o n8n está enviando dados de contatos enriquecidos
    if (payload.contacts) {
      for (const contact of payload.contacts) {
        await processN8nContact(contact)
      }
    }
    
    // Marcar webhook como processado
    await supabaseAdmin
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload', payload)
      .eq('source', 'n8n')

    console.log('✅ Dados n8n processados com sucesso')

  } catch (error) {
    console.error('❌ Erro ao processar dados n8n:', error)
    throw error
  }
}

// Processar conversa do n8n
async function processN8nConversation(conversation: any) {
  try {
    // Exemplo: n8n pode enviar conversas com análise de sentimento, tags, etc.
    const { phone, analysis, tags, score } = conversation
    
    if (!phone) return
    
    // Buscar contato
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()
    
    if (!contact) {
      console.warn(`⚠️ Contato não encontrado para o telefone: ${phone}`)
      return
    }
    
    // Atualizar conversa com dados do n8n
    await supabaseAdmin
      .from('conversations')
      .update({
        // Adicionar campos customizados conforme necessário
        metadata: {
          n8n_analysis: analysis,
          n8n_tags: tags,
          n8n_score: score
        }
      })
      .eq('contact_id', contact.id)
    
    console.log('📊 Conversa enriquecida com dados n8n:', { phone, tags })

  } catch (error) {
    console.error('❌ Erro ao processar conversa n8n:', error)
  }
}

// Processar métricas do n8n
async function processN8nMetrics(metrics: any) {
  try {
    // n8n pode calcular métricas avançadas e enviar para cá
    const {
      date,
      advanced_metrics,
      sentiment_analysis,
      conversion_rate,
      customer_satisfaction
    } = metrics
    
    // Atualizar métricas existentes com dados n8n
    await supabaseAdmin
      .from('dashboard_metrics')
      .update({
        // Adicionar campos customizados
        metadata: {
          n8n_advanced_metrics: advanced_metrics,
          sentiment_analysis,
          conversion_rate,
          customer_satisfaction
        }
      })
      .eq('date', date)
    
    console.log('📈 Métricas enriquecidas com dados n8n:', { date })

  } catch (error) {
    console.error('❌ Erro ao processar métricas n8n:', error)
  }
}

// Processar contato do n8n
async function processN8nContact(contactData: any) {
  try {
    // n8n pode enriquecer contatos com dados externos (CRM, etc.)
    const { phone, enriched_data, tags, segment } = contactData
    
    if (!phone) return
    
    // Atualizar contato com dados enriquecidos
    await supabaseAdmin
      .from('contacts')
      .update({
        // Adicionar dados enriquecidos do n8n
        metadata: {
          n8n_enriched_data: enriched_data,
          n8n_tags: tags,
          n8n_segment: segment
        }
      })
      .eq('phone', phone)
    
    console.log('👤 Contato enriquecido com dados n8n:', { phone, segment })

  } catch (error) {
    console.error('❌ Erro ao processar contato n8n:', error)
  }
}

// Endpoint GET para verificar status
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhooks/n8n',
    description: 'Endpoint para receber dados processados do n8n',
    timestamp: new Date().toISOString(),
    integration: {
      workflow_url: process.env.N8N_WEBHOOK_URL,
      api_configured: !!process.env.N8N_API_KEY
    }
  })
} 