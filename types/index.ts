export interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
}

export interface Message {
  id: string
  content: string
  timestamp: Date
  fromContact: boolean
  read: boolean
}

export interface Conversation {
  id: string
  contact: Contact
  status: 'initiated' | 'waiting' | 'finished'
  lastMessage: Message
  messagesCount: number
  createdAt: Date
  updatedAt: Date
  tags?: string[]
}

export interface DashboardMetrics {
  totalLeads: number
  responseRate: number
  noResponseCount: number
  totalConversations: number
  conversationsToday: number
  avgResponseTime: number // em minutos
}

export interface ChartData {
  name: string
  value: number
  color: string
}

export interface WeeklyData {
  day: string
  conversations: number
  responses: number
} 