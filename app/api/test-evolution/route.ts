import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// Endpoint para testar conexão com Evolution API
export async function GET() {
  try {
    console.log('🔍 Iniciando teste de conexão com Evolution API...')
    
    // Verificar variáveis de ambiente
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionToken = process.env.EVOLUTION_API_TOKEN
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME
    
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: {
        url: evolutionUrl ? 'Configured' : 'NOT_SET',
        token: evolutionToken ? 'Configured' : 'NOT_SET',
        instance: evolutionInstance ? 'Configured' : 'NOT_SET'
      },
      tests: {} as any
    }
    
    // Teste 1: Verificar se as variáveis estão configuradas
    if (!evolutionUrl || !evolutionToken || !evolutionInstance) {
      return NextResponse.json({
        success: false,
        message: 'Variáveis de ambiente não configuradas',
        results: testResults,
        nextSteps: [
          'Configure EVOLUTION_API_URL na Vercel',
          'Configure EVOLUTION_API_TOKEN na Vercel', 
          'Configure EVOLUTION_INSTANCE_NAME na Vercel'
        ]
      }, { status: 500 })
    }
    
    // Teste 2: Verificar se a URL é válida
    try {
      new URL(evolutionUrl)
      testResults.tests.urlValid = { success: true, url: evolutionUrl }
    } catch (error) {
      testResults.tests.urlValid = { 
        success: false, 
        error: 'URL inválida',
        url: evolutionUrl 
      }
      return NextResponse.json({
        success: false,
        message: 'URL da Evolution API inválida',
        results: testResults
      }, { status: 500 })
    }
    
    // Teste 3: Tentar conectar na Evolution API (health check básico)
    try {
      console.log(`🔄 Testando conexão com: ${evolutionUrl}`)
      
      const response = await axios.get(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionToken
        },
        timeout: 10000
      })
      
      testResults.tests.connection = {
        success: true,
        status: response.status,
        data: response.data
      }
      
      console.log('✅ Conexão com Evolution API bem-sucedida!')
      
    } catch (error: any) {
      console.error('❌ Erro na conexão com Evolution API:', error.message)
      
      testResults.tests.connection = {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      }
      
      let errorMessage = 'Erro ao conectar com Evolution API'
      let nextSteps = []
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Servidor Evolution API não encontrado'
        nextSteps = [
          'Verifique se a EVOLUTION_API_URL está correta',
          'Verifique se o servidor Evolution API está online',
          'Teste a URL manualmente no browser'
        ]
      } else if (error.response?.status === 401) {
        errorMessage = 'Token de autenticação inválido'
        nextSteps = [
          'Verifique se o EVOLUTION_API_TOKEN está correto',
          'Verifique se o token não expirou',
          'Regenere o token na Evolution API'
        ]
      } else if (error.response?.status === 404) {
        errorMessage = 'Instância não encontrada'
        nextSteps = [
          'Verifique se o EVOLUTION_INSTANCE_NAME está correto',
          'Verifique se a instância existe na Evolution API',
          'Crie a instância se necessário'
        ]
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Conexão recusada pelo servidor'
        nextSteps = [
          'Verifique se o servidor Evolution API está rodando',
          'Verifique se a porta está correta na URL',
          'Verifique firewalls/proxy'
        ]
      } else {
        nextSteps = [
          'Verifique os logs detalhados',
          'Teste a conexão manualmente',
          'Verifique configurações de rede'
        ]
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        results: testResults,
        nextSteps
      }, { status: 500 })
    }
    
    // Teste 4: Tentar buscar dados básicos (chats)
    try {
      console.log('🔍 Testando busca de chats...')
      const chatsResponse = await axios.post(`${evolutionUrl}/chat/findChats/${evolutionInstance}`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionToken
        },
        timeout: 10000
      })
      
      testResults.tests.chatsAccess = {
        success: true,
        status: chatsResponse.status,
        totalChats: Array.isArray(chatsResponse.data) ? chatsResponse.data.length : 'unknown',
        sampleData: Array.isArray(chatsResponse.data) ? chatsResponse.data.slice(0, 2) : chatsResponse.data
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar chats:', error.message)
      testResults.tests.chatsAccess = {
        success: false,
        error: error.message,
        status: error.response?.status,
        details: error.response?.data
      }
    }
    
    // Teste 5: Testar busca de contatos
    try {
      console.log('🔍 Testando busca de contatos...')
      const contactsResponse = await axios.post(`${evolutionUrl}/chat/findContacts/${evolutionInstance}`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionToken
        },
        timeout: 10000
      })
      
      testResults.tests.contactsAccess = {
        success: true,
        status: contactsResponse.status,
        totalContacts: Array.isArray(contactsResponse.data) ? contactsResponse.data.length : 'unknown',
        sampleData: Array.isArray(contactsResponse.data) ? contactsResponse.data.slice(0, 2) : contactsResponse.data
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar contatos:', error.message)
      testResults.tests.contactsAccess = {
        success: false,
        error: error.message,
        status: error.response?.status,
        details: error.response?.data
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com Evolution API estabelecida com sucesso!',
      results: testResults,
      nextSteps: [
        'Execute a sincronização de dados no painel Admin',
        'Configure webhooks para dados em tempo real',
        'Teste as funcionalidades do dashboard'
      ]
    })
    
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno no teste de conexão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Endpoint POST para testar configuração específica
export async function POST(request: NextRequest) {
  try {
    const { url, token, instance } = await request.json()
    
    if (!url || !token || !instance) {
      return NextResponse.json({
        success: false,
        message: 'URL, token e instance são obrigatórios'
      }, { status: 400 })
    }
    
    // Testar com configuração personalizada
    const response = await axios.get(`${url}/instance/connectionState/${instance}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': token
      },
      timeout: 10000
    })
    
    return NextResponse.json({
      success: true,
      message: 'Configuração testada com sucesso!',
      data: response.data
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Erro na configuração testada',
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    }, { status: 500 })
  }
} 