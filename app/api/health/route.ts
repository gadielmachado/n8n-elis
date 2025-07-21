import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { evolutionAPI } from '@/lib/evolution-api'
import axios from 'axios'

// Health Check completo do sistema
export async function GET() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      evolution_api: false,
      n8n: false
    },
    details: {
      database: null as any,
      evolution_api: null as any,
      n8n: null as any
    }
  }

  // Verificar Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('count')
      .limit(1)

    healthStatus.services.database = !error
    healthStatus.details.database = {
      connected: !error,
      latency: null, // Implementar medição de latência se necessário
      lastError: error?.message || null
    }
  } catch (error) {
    healthStatus.services.database = false
    healthStatus.details.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Verificar Evolution API
  try {
    const isHealthy = await evolutionAPI.healthCheck()
    healthStatus.services.evolution_api = isHealthy
    
    if (isHealthy) {
      const instanceInfo = await evolutionAPI.getConnectionState()
      healthStatus.details.evolution_api = {
        connected: true,
        instance: process.env.EVOLUTION_INSTANCE_NAME,
        state: instanceInfo.state,
        url: process.env.EVOLUTION_API_URL
      }
    } else {
      healthStatus.details.evolution_api = {
        connected: false,
        instance: process.env.EVOLUTION_INSTANCE_NAME,
        url: process.env.EVOLUTION_API_URL
      }
    }
  } catch (error) {
    healthStatus.services.evolution_api = false
    healthStatus.details.evolution_api = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: process.env.EVOLUTION_API_URL
    }
  }

  // Verificar n8n
  try {
    if (process.env.N8N_WEBHOOK_URL) {
      // Tentar ping no n8n (se tiver endpoint de health)
      const n8nHealthUrl = process.env.N8N_WEBHOOK_URL.replace('/webhook/jump-sheets', '/healthz')
      
      try {
        const response = await axios.get(n8nHealthUrl, { timeout: 5000 })
        healthStatus.services.n8n = response.status === 200
        healthStatus.details.n8n = {
          connected: true,
          url: process.env.N8N_WEBHOOK_URL,
          status: response.status
        }
      } catch {
        // Se não tem endpoint de health, verificar se a URL existe
        healthStatus.services.n8n = !!process.env.N8N_WEBHOOK_URL
        healthStatus.details.n8n = {
          connected: !!process.env.N8N_WEBHOOK_URL,
          url: process.env.N8N_WEBHOOK_URL,
          note: 'Configurado mas sem health check'
        }
      }
    } else {
      healthStatus.services.n8n = false
      healthStatus.details.n8n = {
        connected: false,
        error: 'N8N_WEBHOOK_URL não configurado'
      }
    }
  } catch (error) {
    healthStatus.services.n8n = false
    healthStatus.details.n8n = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Determinar status geral
  const allHealthy = Object.values(healthStatus.services).every(Boolean)
  healthStatus.status = allHealthy ? 'healthy' : 'degraded'

  // Status HTTP baseado na saúde geral
  const httpStatus = allHealthy ? 200 : 503

  return NextResponse.json(healthStatus, { status: httpStatus })
}

// Endpoint para verificar cada serviço individualmente
export async function POST(request: Request) {
  try {
    const { service } = await request.json()

    switch (service) {
      case 'database':
        return await checkDatabase()
      case 'evolution':
        return await checkEvolution()
      case 'n8n':
        return await checkN8n()
      default:
        return NextResponse.json(
          { error: 'Serviço não encontrado' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar serviço' },
      { status: 500 }
    )
  }
}

async function checkDatabase() {
  try {
    const start = Date.now()
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('count')
      .limit(1)
    const latency = Date.now() - start

    return NextResponse.json({
      service: 'database',
      healthy: !error,
      latency: `${latency}ms`,
      details: error ? { error: error.message } : { connected: true }
    })
  } catch (error) {
    return NextResponse.json({
      service: 'database',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function checkEvolution() {
  try {
    const start = Date.now()
    const isHealthy = await evolutionAPI.healthCheck()
    const latency = Date.now() - start

    const details = isHealthy 
      ? await evolutionAPI.getConnectionState()
      : { error: 'Connection failed' }

    return NextResponse.json({
      service: 'evolution_api',
      healthy: isHealthy,
      latency: `${latency}ms`,
      details
    })
  } catch (error) {
    return NextResponse.json({
      service: 'evolution_api',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function checkN8n() {
  try {
    const configured = !!process.env.N8N_WEBHOOK_URL
    
    return NextResponse.json({
      service: 'n8n',
      healthy: configured,
      details: {
        webhook_url: process.env.N8N_WEBHOOK_URL || 'Not configured',
        api_key_configured: !!process.env.N8N_API_KEY
      }
    })
  } catch (error) {
    return NextResponse.json({
      service: 'n8n',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 