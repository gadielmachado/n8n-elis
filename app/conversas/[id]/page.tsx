'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Message, Conversation } from '@/types'
import { ArrowLeft, Phone, Video, MoreVertical, Send, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      loadConversationData()
    }
  }, [conversationId])

  // Scroll automático para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const loadConversationData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados da conversa
      const conversations = await api.getConversations()
      const conv = conversations.find(c => c.id === conversationId)
      setConversation(conv || null)

      // Buscar mensagens
      let msgs = await api.getConversationMessages(conversationId)
      
      // Se não há mensagens, tentar sincronizar da Evolution API
      if (msgs.length === 0 && conv) {
        console.log('🔄 Nenhuma mensagem encontrada, sincronizando da Evolution API...')
        try {
          const syncResponse = await fetch(`/api/conversations/${conversationId}/sync-messages`, {
            method: 'POST'
          })
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log('✅ Sincronização automática concluída:', syncData)
            
            // Recarregar mensagens após sincronização
            msgs = await api.getConversationMessages(conversationId)
          }
        } catch (syncError) {
          console.warn('⚠️ Erro na sincronização automática:', syncError)
        }
      }
      
      setMessages(msgs)
      
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return
    
    try {
      setSending(true)
      console.log('Enviar mensagem:', newMessage)
      
      // Adicionar mensagem temporária na interface (otimistic update)
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        content: newMessage,
        timestamp: new Date().toISOString(),
        fromContact: false,
        read: true,
        messageType: 'text'
      }
      
      setMessages(prev => [...prev, tempMessage])
      
      // Limpar campo de input imediatamente
      const messageToSend = newMessage
      setNewMessage('')
      
      // Enviar mensagem via API
      const response = await api.sendMessage(conversationId, messageToSend)
      
      if (response.success) {
        console.log('✅ Mensagem enviada com sucesso!')
        
        // Recarregar mensagens para obter dados atualizados do servidor
        const updatedMessages = await api.getConversationMessages(conversationId)
        setMessages(updatedMessages)
        
      } else {
        throw new Error(response.error || 'Erro ao enviar mensagem')
      }
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp_')))
      
      // Restaurar texto no input
      setNewMessage(newMessage)
      
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleSyncMessages = async () => {
    try {
      setSyncing(true)
      console.log('🔄 Sincronizando mensagens manualmente...')
      
      const syncResponse = await fetch(`/api/conversations/${conversationId}/sync-messages`, {
        method: 'POST'
      })
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        console.log('✅ Sincronização manual concluída:', syncData)
        
        // Recarregar mensagens
        const msgs = await api.getConversationMessages(conversationId)
        setMessages(msgs)
        
        // Mostrar resultado
        alert(`Sincronização concluída!\n${syncData.synced} mensagens sincronizadas`)
      } else {
        throw new Error('Erro na sincronização')
      }
    } catch (error) {
      console.error('❌ Erro na sincronização manual:', error)
      alert('Erro ao sincronizar mensagens')
    } finally {
      setSyncing(false)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Conversa não encontrada
          </h2>
          <button 
            onClick={() => router.back()}
            className="btn-primary"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                {conversation.contact.avatar || '👤'}
              </div>
              
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-gray-100">
                  {conversation.contact.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {conversation.contact.phone}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncMessages}
              disabled={syncing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Sincronizar mensagens"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Nenhuma mensagem encontrada nesta conversa.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromContact ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.fromContact
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'bg-primary-500 text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.fromContact 
                    ? 'text-gray-500 dark:text-gray-400' 
                    : 'text-primary-100'
                }`}>
                  {formatMessageTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        {/* Elemento para scroll automático */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors"
          >
            {sending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 