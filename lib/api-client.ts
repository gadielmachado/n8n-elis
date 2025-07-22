import axios, { AxiosInstance } from 'axios'
import { DashboardMetrics, ChartData, WeeklyData, Conversation, Message } from '@/types'

// Função para detectar a URL base da aplicação
function getBaseUrl(): string {
  // Em ambiente de servidor (API routes)
  if (typeof window === 'undefined') {
    // Em produção na Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    
    // URL configurada manualmente
    if (process.env.NEXTAUTH_URL) {
      return process.env.NEXTAUTH_URL
    }
    
    // Fallback para desenvolvimento
    return 'http://localhost:3000'
  }
  
  // No cliente (browser), usar URL atual
  return window.location.origin
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    const baseURL = getBaseUrl()
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    })

    // Interceptor para logs detalhados
    this.client.interceptors.request.use(request => {
      console.log('🔄 API Request:', {
        method: request.method?.toUpperCase(),
        url: `${baseURL}${request.url}`,
        baseURL
      })
      return request
    })

    this.client.interceptors.response.use(
      response => {
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url
        })
        return response
      },
      error => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.error || error.message,
          baseURL
        })
        throw error
      }
    )

    console.log('🔧 API Client initialized with baseURL:', baseURL)
  }

  // Dashboard APIs
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await this.client.get('/api/dashboard')
    return response.data.metrics
  }

  async getChartData(): Promise<ChartData[]> {
    const response = await this.client.get('/api/dashboard')
    return response.data.chartData
  }

  async getWeeklyData(): Promise<WeeklyData[]> {
    const response = await this.client.get('/api/dashboard')
    return response.data.weeklyData
  }

  async recalculateMetrics(date?: string): Promise<any> {
    const response = await this.client.post('/api/dashboard', { date })
    return response.data
  }

  // Conversations APIs
  async getConversations(status?: string): Promise<Conversation[]> {
    const params = status ? { status } : {}
    const response = await this.client.get('/api/conversations', { params })
    return response.data.conversations
  }

  async searchConversations(search: string, status?: string): Promise<Conversation[]> {
    const params = { search, ...(status && { status }) }
    const response = await this.client.get('/api/conversations', { params })
    return response.data.conversations
  }

  async createConversation(contactId: string, message?: string): Promise<any> {
    const response = await this.client.post('/api/conversations', {
      contactId,
      message
    })
    return response.data
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const response = await this.client.get(`/api/conversations/${conversationId}/messages`)
    return response.data.messages
  }

  async sendMessage(conversationId: string, message: string, messageType: string = 'text'): Promise<any> {
    const response = await this.client.post(`/api/conversations/${conversationId}/send-message`, {
      message,
      messageType
    })
    return response.data
  }

  // Evolution API Sync
  async syncEvolutionData(type: 'messages' | 'contacts' | 'chats' | 'all', limit?: number): Promise<any> {
    const response = await this.client.post('/api/evolution/sync', {
      type,
      limit
    })
    return response.data
  }

  async getEvolutionStatus(): Promise<any> {
    const response = await this.client.get('/api/evolution/sync')
    return response.data
  }

  // Webhook Status
  async getWebhookLogs(source?: 'evolution' | 'n8n', limit: number = 10): Promise<any> {
    const params = { ...(source && { source }), limit }
    const response = await this.client.get('/api/webhooks/logs', { params })
    return response.data
  }

  // Health Check
  async healthCheck(): Promise<{
    status: string
    services: {
      database: boolean
      evolution_api: boolean
      n8n: boolean
    }
    details: any
    timestamp: string
  }> {
    const response = await this.client.get('/api/health')
    return response.data
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Wrapper functions para manter compatibilidade com o código existente
export const api = {
  getDashboardMetrics: () => apiClient.getDashboardMetrics(),
  getConversations: (status?: string) => apiClient.getConversations(status),
  getConversationMessages: (conversationId: string) => apiClient.getConversationMessages(conversationId),
  sendMessage: (conversationId: string, message: string, messageType?: string) => apiClient.sendMessage(conversationId, message, messageType),
  getChartData: () => apiClient.getChartData(),
  getWeeklyData: () => apiClient.getWeeklyData(),
  
  // Funções adicionais
  syncData: (type: 'messages' | 'contacts' | 'chats' | 'all', limit?: number) => 
    apiClient.syncEvolutionData(type, limit),
  
  recalculateMetrics: (date?: string) => apiClient.recalculateMetrics(date),
  
  searchConversations: (search: string, status?: string) => 
    apiClient.searchConversations(search, status),
  
  healthCheck: () => apiClient.healthCheck()
} 