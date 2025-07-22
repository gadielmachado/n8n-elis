import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Conversation } from '@/types'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  MessageCircle, 
  CheckCircle2, 
  Circle,
  AlertCircle 
} from 'lucide-react'

interface ConversationCardProps {
  conversation: Conversation
  onClick?: () => void
}

const statusConfig = {
  initiated: {
    label: 'Iniciada',
    icon: Circle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  waiting: {
    label: 'Aguardando',
    icon: AlertCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  finished: {
    label: 'Finalizada',
    icon: CheckCircle2,
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-50 dark:bg-primary-900/20'
  }
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const status = statusConfig[conversation.status]
  const StatusIcon = status.icon
  
  const timeAgo = formatDistanceToNow(new Date(conversation.updatedAt), {
    addSuffix: true,
    locale: ptBR
  })

  return (
    <div 
      className="conversation-card"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-xl">
          {conversation.contact.avatar || '👤'}
        </div>
        
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {conversation.contact.name}
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {timeAgo}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {conversation.contact.phone}
          </p>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
            {conversation.lastMessage.content}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status */}
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                status.bgColor,
                status.color
              )}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </div>
              
              {/* Número de mensagens */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-3 h-3" />
                {conversation.messagesCount}
              </div>
            </div>
            
            {/* Tags */}
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex gap-1">
                {conversation.tags.slice(0, 2).map((tag) => (
                  <span 
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {conversation.tags.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{conversation.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 