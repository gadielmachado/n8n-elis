'use client'

import { useEffect, useState } from 'react'
import { ConversationCard } from '@/components/conversation-card'
import { Tabs } from '@/components/tabs'
import { api } from '@/lib/api-client'
import { Conversation } from '@/types'
import { Search, Filter, SortDesc, RefreshCw } from 'lucide-react'

type ConversationStatus = 'all' | 'initiated' | 'waiting' | 'finished'

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [activeTab, setActiveTab] = useState<ConversationStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [conversations, activeTab, searchTerm])

  const loadConversations = async () => {
    try {
      const data = await api.getConversations()
      setConversations(data)
      setLastUpdated(new Date().toLocaleString('pt-BR'))
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = conversations

    // Filtrar por status
    if (activeTab !== 'all') {
      filtered = filtered.filter(conv => conv.status === activeTab)
    }

    // Filtrar por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(conv => 
        conv.contact.name.toLowerCase().includes(searchLower) ||
        conv.contact.phone.includes(searchTerm) ||
        conv.lastMessage.content.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por data de atualização (mais recentes primeiro)
    filtered.sort((a, b) => {
      // Converter strings de data para objetos Date para comparação
      const dateA = new Date(a.updatedAt)
      const dateB = new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })

    setFilteredConversations(filtered)
  }

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    
    // Se tem termo de busca, fazer busca na API também
    if (term.length > 2) {
      try {
        const searchResults = await api.searchConversations(term, activeTab !== 'all' ? activeTab : undefined)
        
        // Mesclar resultados locais com resultados da API
        const localResults = conversations.filter(conv => 
          conv.contact.name.toLowerCase().includes(term.toLowerCase()) ||
          conv.contact.phone.includes(term) ||
          conv.lastMessage.content.toLowerCase().includes(term.toLowerCase())
        )
        
        // Combinar e remover duplicatas
        const combined = [...localResults, ...searchResults]
        const unique = combined.filter((conv, index, arr) => 
          arr.findIndex(c => c.id === conv.id) === index
        )
        
        setFilteredConversations(unique)
      } catch (error) {
        console.error('Erro na busca:', error)
        // Em caso de erro, usar apenas filtros locais
        applyFilters()
      }
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await loadConversations()
  }

  const getTabCount = (status: ConversationStatus) => {
    if (status === 'all') return conversations.length
    return conversations.filter(conv => conv.status === status).length
  }

  const tabs = [
    { id: 'all', label: 'Todas', count: getTabCount('all') },
    { id: 'initiated', label: 'Iniciadas', count: getTabCount('initiated') },
    { id: 'waiting', label: 'Aguardando Resposta', count: getTabCount('waiting') },
    { id: 'finished', label: 'Finalizadas', count: getTabCount('finished') }
  ]

  const handleConversationClick = (conversation: Conversation) => {
    // Aqui seria implementada a navegação para visualizar a conversa completa
    console.log('Abrir conversa:', conversation.id)
    // Exemplo: router.push(`/conversas/${conversation.id}`)
    
    // Por enquanto, mostrar detalhes em alert
    alert(`Conversa com ${conversation.contact.name}\nTelefone: ${conversation.contact.phone}\nStatus: ${conversation.status}\nMensagens: ${conversation.messagesCount}`)
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Conversas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie suas conversas do WhatsApp
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Atualizado: {lastUpdated}
              </span>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou mensagem..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
            />
          </div>
          
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <SortDesc className="w-4 h-4" />
              Ordenar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as ConversationStatus)}
        className="mb-6"
      />

      {/* Lista de Conversas */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando conversas...</p>
          </div>
        )}
        
        {!loading && filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nenhuma conversa encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm 
                ? 'Tente ajustar os termos da busca ou filtros.'
                : 'Não há conversas nesta categoria no momento.'
              }
            </p>
            
            {conversations.length === 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 mb-3">
                  Para começar a ver conversas aqui, você precisa:
                </p>
                <ol className="text-left text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Configurar webhooks da Evolution API</li>
                  <li>2. Receber algumas mensagens no WhatsApp</li>
                  <li>3. Ou sincronizar dados históricos no painel admin</li>
                </ol>
                <button 
                  onClick={() => window.location.href = '/admin'}
                  className="mt-3 btn-primary"
                >
                  Ir para Admin
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                onClick={() => handleConversationClick(conversation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Exibindo {filteredConversations.length} de {conversations.length} conversas
          </span>
          
          {searchTerm && (
            <span>
              Filtrado por: "{searchTerm}"
            </span>
          )}
        </div>
        
        {conversations.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            💡 Dica: As conversas são atualizadas automaticamente via webhooks da Evolution API
          </div>
        )}
      </div>
    </div>
  )
} 