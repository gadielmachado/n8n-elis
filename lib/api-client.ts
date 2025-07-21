import axios, { AxiosInstance } from 'axios'
import { DashboardMetrics, ChartData, WeeklyData, Conversation } from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    })

    // Interceptor para logs (remover em produção)
    this.client.interceptors.request.use(request => {
      console.log('🔄 API Request:', {
        method: request.method?.toUpperCase(),
        url: request.url
      })
      return request
    })

    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.error || error.message
        })
        throw error
      }
    )
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