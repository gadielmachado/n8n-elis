import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Testando configuração de webhooks...')
    
    // Verificar se a Evolution API está funcionando
    const healthCheck = await evolutionAPI.healthCheck()
    console.log('🏥 Health check:', healthCheck)
    
    if (!healthCheck) {
      return NextResponse.json({
        success: false,
        error: 'Evolution API não está respondendo'
      }, { status: 500 })
    }
    
    // Obter URL base da aplicação
    const baseUrl = getBaseUrl(request)
    const webhookUrl = `${baseUrl}/api/webhooks/evolution`
    
    console.log('🔗 Configurando webhook URL:', webhookUrl)
    
    // Configurar webhook
    try {
      const webhookResult = await evolutionAPI.setWebhook(webhookUrl, [
        'messages.upsert',
        'connection.update'
      ])
      
      console.log('✅ Webhook configurado:', webhookResult)
      
      // Verificar se o webhook foi configurado
      const currentWebhook = await evolutionAPI.getWebhook()
      console.log('📋 Webhook atual:', currentWebhook)
      
      return NextResponse.json({
        success: true,
        message: 'Webhooks configurados com sucesso',
        data: {
          healthCheck,
          webhookUrl,
          webhookConfig: webhookResult,
          currentWebhook
        }
      })
      
    } catch (webhookError) {
      console.error('❌ Erro ao configurar webhook:', webhookError)
      
      return NextResponse.json({
        success: false,
        error: 'Erro ao configurar webhook',
        details: webhookError instanceof Error ? webhookError.message : 'Erro desconhecido',
        data: {
          healthCheck,
          webhookUrl
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de webhook:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar status atual
    const healthCheck = await evolutionAPI.healthCheck()
    const baseUrl = getBaseUrl(request)
    const webhookUrl = `${baseUrl}/api/webhooks/evolution`
    
    let currentWebhook = null
    try {
      currentWebhook = await evolutionAPI.getWebhook()
    } catch (error) {
      console.warn('⚠️ Não foi possível obter webhook atual:', error)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        evolutionApiHealth: healthCheck,
        webhookUrl,
        currentWebhook,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

function getBaseUrl(request: NextRequest): string {
  // Em produção na Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // URL configurada manualmente
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // Tentar extrair da requisição
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  
  if (host) {
    return `${protocol}://${host}`
  }
  
  // Fallback para localhost
  return 'http://localhost:3000'
} 