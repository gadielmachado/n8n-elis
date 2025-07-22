import { Conversation, Contact, Message, DashboardMetrics, ChartData, WeeklyData } from '@/types'

// Dados de contatos mockados
const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Ana Silva',
    phone: '+55 11 99999-0001',
    avatar: '👩‍💼'
  },
  {
    id: '2', 
    name: 'Carlos Santos',
    phone: '+55 11 99999-0002',
    avatar: '👨‍💻'
  },
  {
    id: '3',
    name: 'Maria Oliveira',
    phone: '+55 11 99999-0003',
    avatar: '👩‍🎓'
  },
  {
    id: '4',
    name: 'João Pereira',
    phone: '+55 11 99999-0004',
    avatar: '👨‍🏭'
  },
  {
    id: '5',
    name: 'Fernanda Costa',
    phone: '+55 11 99999-0005',
    avatar: '👩‍⚕️'
  },
  {
    id: '6',
    name: 'Roberto Lima',
    phone: '+55 11 99999-0006',
    avatar: '👨‍🚀'
  }
]

// Mensagens mockadas
const createMockMessage = (id: string, content: string, fromContact: boolean, timestamp: string): Message => ({
  id,
  content,
  fromContact,
  timestamp,
  read: true
})

// Conversas mockadas
export const mockConversations: Conversation[] = [
  {
    id: '1',
    contact: mockContacts[0],
    status: 'waiting',
    lastMessage: createMockMessage('m1', 'Olá! Gostaria de saber mais sobre seus serviços.', true, new Date(Date.now() - 1000 * 60 * 30).toISOString()),
    messagesCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    tags: ['novo-lead', 'interessado']
  },
  {
    id: '2',
    contact: mockContacts[1],
    status: 'initiated',
    lastMessage: createMockMessage('m2', 'Obrigado pelo contato! Em breve retornaremos.', false, new Date(Date.now() - 1000 * 60 * 15).toISOString()),
    messagesCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    tags: ['follow-up']
  },
  {
    id: '3',
    contact: mockContacts[2],
    status: 'finished',
    lastMessage: createMockMessage('m3', 'Perfeito! Obrigada pela atenção.', true, new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()),
    messagesCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    tags: ['convertido', 'sucesso']
  },
  {
    id: '4',
    contact: mockContacts[3],
    status: 'waiting',
    lastMessage: createMockMessage('m4', 'Preciso de mais informações sobre preços.', true, new Date(Date.now() - 1000 * 60 * 45).toISOString()),
    messagesCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    tags: ['pricing', 'hot-lead']
  },
  {
    id: '5',
    contact: mockContacts[4],
    status: 'initiated',
    lastMessage: createMockMessage('m5', 'Oi! Vi seu anúncio no Instagram.', true, new Date(Date.now() - 1000 * 60 * 10).toISOString()),
    messagesCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    tags: ['instagram', 'novo-lead']
  },
  {
    id: '6',
    contact: mockContacts[5],
    status: 'finished',
    lastMessage: createMockMessage('m6', 'Fechado! Aguardo o contrato.', true, new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()),
    messagesCount: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    tags: ['convertido', 'contrato']
  }
]

// Métricas do dashboard
export const mockDashboardMetrics: DashboardMetrics = {
  totalLeads: 156,
  responseRate: 73.5,
  noResponseCount: 41,
  totalConversations: mockConversations.length,
  conversationsToday: 12,
  avgResponseTime: 18
}

// Dados para gráfico de pizza
export const mockChartData: ChartData[] = [
  {
    name: 'Responderam',
    value: 115,
    color: '#1DB954'
  },
  {
    name: 'Não Responderam', 
    value: 41,
    color: '#ff6b6b'
  }
]

// Dados semanais para gráfico de linha
export const mockWeeklyData: WeeklyData[] = [
  { day: 'Seg', conversations: 23, responses: 18 },
  { day: 'Ter', conversations: 31, responses: 25 },
  { day: 'Qua', conversations: 28, responses: 22 },
  { day: 'Qui', conversations: 35, responses: 28 },
  { day: 'Sex', conversations: 42, responses: 31 },
  { day: 'Sáb', conversations: 18, responses: 12 },
  { day: 'Dom', conversations: 15, responses: 9 }
]

// API simulada - será substituída por integração real com n8n
export const api = {
  getDashboardMetrics: (): Promise<DashboardMetrics> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockDashboardMetrics), 500)
    })
  },
  
  getConversations: (status?: string): Promise<Conversation[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        if (status) {
          resolve(mockConversations.filter(conv => conv.status === status))
        } else {
          resolve(mockConversations)
        }
      }, 300)
    })
  },
  
  getChartData: (): Promise<ChartData[]> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockChartData), 200)
    })
  },
  
  getWeeklyData: (): Promise<WeeklyData[]> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockWeeklyData), 200)
    })
  }
} 