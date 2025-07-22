import axios, { AxiosInstance, AxiosResponse } from 'axios'

// Interfaces baseadas na documentação da Evolution API
export interface EvolutionMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  pushName?: string
  message: {
    conversation?: string
    extendedTextMessage?: {
      text: string
    }
    imageMessage?: any
    documentMessage?: any
    audioMessage?: any
    videoMessage?: any
  }
  messageTimestamp: number
  status: string
}

export interface EvolutionContact {
  id: string
  pushName?: string
  profilePictureUrl?: string
  isMyContact: boolean
  isWAContact: boolean
}

export interface EvolutionChat {
  id: string
  name?: string
  isGroup: boolean
  unreadCount: number
  lastMessageTimestamp: number
  archived: boolean
}

export interface EvolutionWebhookPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    pushName?: string
    message: {
      conversation?: string
      extendedTextMessage?: {
        text: string
      }
    }
    messageTimestamp: number
    status?: string
  }
  date_time: string
  sender: string
  server_url: string
  apikey: string
  webhookUrl: string
}

export interface EvolutionInstanceState {
  state: string
  qrcode?: string
}

export interface SyncOptions {
  type: 'messages' | 'contacts' | 'chats' | 'all'
  limit?: number
}

export interface FindMessagesParams {
  where?: {
    owner?: string
    key?: {
      remoteJid?: string
      fromMe?: boolean
      id?: string
    }
  }
  page?: number
  offset?: number
  limit?: number
}

export interface FindChatsParams {
  page?: number
  offset?: number
  limit?: number
}

// Função para validar e obter variáveis de ambiente da Evolution API
function getEvolutionEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set. Please check your .env.local file or Vercel environment variables.`)
  }
  return value
}

export class EvolutionAPI {
  private client: AxiosInstance
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor() {
    try {
      this.baseUrl = getEvolutionEnvVar('EVOLUTION_API_URL')
      this.apiKey = getEvolutionEnvVar('EVOLUTION_API_TOKEN')
      this.instanceName = getEvolutionEnvVar('EVOLUTION_INSTANCE_NAME')

      // Validar formato da URL
      if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
        throw new Error('EVOLUTION_API_URL must start with http:// or https://')
      }

      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        timeout: 30000
      })

      // Interceptor para logs detalhados
      this.client.interceptors.request.use(request => {
        console.log('🔄 Evolution API Request:', {
          method: request.method?.toUpperCase(),
          url: `${this.baseUrl}${request.url}`,
          headers: {
            'Content-Type': request.headers['Content-Type'],
            'apikey': this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT_SET'
          },
          instance: this.instanceName
        })
        return request
      })

      this.client.interceptors.response.use(
        response => {
          console.log('✅ Evolution API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data ? 'Data received' : 'No data'
          })
          return response
        },
        error => {
          console.error('❌ Evolution API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            data: error.response?.data,
            baseURL: this.baseUrl,
            instance: this.instanceName
          })
          throw error
        }
      )

      console.log('🔧 Evolution API initialized:', {
        baseUrl: this.baseUrl,
        instance: this.instanceName,
        tokenConfigured: !!this.apiKey
      })

    } catch (error) {
      console.error('❌ Failed to initialize Evolution API:', error)
      throw error
    }
  }

  // 1. Instance Management
  async getInstanceInfo(): Promise<any> {
    const response = await this.client.get(`/instance/connect/${this.instanceName}`)
    return response.data
  }

  async getConnectionState(): Promise<any> {
    const response = await this.client.get(`/instance/connectionState/${this.instanceName}`)
    return response.data
  }

  // 2. Messages
  async findMessages(params: FindMessagesParams = {}): Promise<EvolutionMessage[]> {
    const response = await this.client.post(`/chat/findMessages/${this.instanceName}`, params)
    
    // Verificar se response.data é um array ou contém dados dentro de uma propriedade
    let messages = response.data
    if (!Array.isArray(messages)) {
      // Se não for array, talvez esteja em response.data.messages ou similar
      if (messages && messages.messages && Array.isArray(messages.messages)) {
        messages = messages.messages
      } else if (messages && messages.data && Array.isArray(messages.data)) {
        messages = messages.data
      } else {
        console.warn('⚠️ Resposta da API não contém array de mensagens:', messages)
        return []
      }
    }
    
    return messages
  }

  async sendTextMessage(number: string, text: string): Promise<EvolutionMessage> {
    const response = await this.client.post(`/message/sendText/${this.instanceName}`, {
      number,
      text
    })
    return response.data
  }

  // 3. Chats
  async findChats(params: FindChatsParams = {}): Promise<EvolutionChat[]> {
    const response = await this.client.post(`/chat/findChats/${this.instanceName}`, {
      ...params,
      limit: params.limit || 100
    })
    return response.data
  }

  // 4. Contacts
  async findContacts(): Promise<EvolutionContact[]> {
    const response = await this.client.post(`/chat/findContacts/${this.instanceName}`, {})
    return response.data
  }

  async getProfilePictureUrl(number: string): Promise<{ profilePictureUrl?: string }> {
    try {
      const response = await this.client.post(`/chat/fetchProfilePictureUrl/${this.instanceName}`, {
        number
      })
      return response.data
    } catch (error) {
      console.warn('Erro ao buscar foto de perfil:', error)
      return {}
    }
  }

  // 5. Webhook Management
  async setWebhook(url: string, events: string[] = ['messages.upsert']): Promise<any> {
    const response = await this.client.post(`/webhook/set/${this.instanceName}`, {
      url,
      events,
      enabled: true
    })
    return response.data
  }

  async getWebhook(): Promise<any> {
    const response = await this.client.get(`/webhook/find/${this.instanceName}`)
    return response.data
  }

  // 6. Sync Methods (para buscar dados históricos)
  async syncAllMessages(limit: number = 1000): Promise<EvolutionMessage[]> {
    try {
      const messages = await this.findMessages({
        limit,
        page: 1
      })
      
      console.log(`📥 Sincronizadas ${messages?.length || 0} mensagens da Evolution API`)
      
      // Verificar se o retorno é válido
      if (!Array.isArray(messages)) {
        console.error('❌ Resposta da API não é um array:', messages)
        return []
      }
      
      return messages
    } catch (error) {
      console.error('❌ Erro ao sincronizar mensagens:', error)
      throw error
    }
  }

  async syncAllChats(): Promise<EvolutionChat[]> {
    try {
      const chats = await this.findChats({
        limit: 500
      })
      
      console.log(`📥 Sincronizados ${chats.length} chats da Evolution API`)
      return chats
    } catch (error) {
      console.error('Erro ao sincronizar chats:', error)
      throw error
    }
  }

  async syncAllContacts(): Promise<EvolutionContact[]> {
    try {
      const contacts = await this.findContacts()
      
      console.log(`📥 Sincronizados ${contacts.length} contatos da Evolution API`)
      return contacts
    } catch (error) {
      console.error('Erro ao sincronizar contatos:', error)
      throw error
    }
  }

  // 7. Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const state = await this.getConnectionState()
      return state.state === 'open'
    } catch (error) {
      console.error('Evolution API não está acessível:', error)
      return false
    }
  }

  // 8. Utility Methods
  formatPhoneNumber(phone: string): string {
    // Remove caracteres especiais e adiciona @s.whatsapp.net se necessário
    const cleanPhone = phone.replace(/[^\d]/g, '')
    return cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`
  }

  extractPhoneFromJid(jid: string): string {
    if (!jid || typeof jid !== 'string') {
      console.warn('⚠️ JID inválido:', jid)
      return ''
    }
    return jid.replace('@s.whatsapp.net', '').replace('@c.us', '')
  }
}

// Singleton instance
export const evolutionAPI = new EvolutionAPI() 