'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { 
  RefreshCw, 
  Database, 
  Zap, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthStatus {
  status: string
  services: {
    database: boolean
    evolution_api: boolean
    n8n: boolean
  }
  details: any
  timestamp: string
}

interface SyncResult {
  success: boolean
  result?: any
  error?: string
}

export function AdminPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<{ [key: string]: SyncResult }>({})

  useEffect(() => {
    checkHealth()
    // Verificar saúde a cada 30 segundos
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const healthData = await apiClient.healthCheck()
      setHealth(healthData)
    } catch (error) {
      console.error('Erro ao verificar saúde:', error)
    }
  }

  const handleSync = async (type: 'messages' | 'contacts' | 'chats' | 'all') => {
    setSyncLoading(type)
    try {
      const result = await apiClient.syncEvolutionData(type, type === 'all' ? 500 : 100)
      setSyncResults(prev => ({
        ...prev,
        [type]: { success: true, result }
      }))
    } catch (error) {
      setSyncResults(prev => ({
        ...prev,
        [type]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        }
      }))
    } finally {
      setSyncLoading(null)
    }
  }

  const handleRecalculateMetrics = async () => {
    setLoading(true)
    try {
      await apiClient.recalculateMetrics()
      alert('Métricas recalculadas com sucesso!')
    } catch (error) {
      alert('Erro ao recalcular métricas')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  }

  const getStatusColor = (healthy: boolean) => {
    return healthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Painel Administrativo
        </h2>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar Status
        </button>
      </div>

      {/* Status dos Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Banco de Dados</h3>
            {health && getStatusIcon(health.services.database)}
          </div>
          <p className={cn("text-sm", health && getStatusColor(health.services.database))}>
            {health?.services.database ? 'Conectado' : 'Desconectado'}
          </p>
          {health?.details.database?.error && (
            <p className="text-xs text-red-500 mt-1">
              {health.details.database.error}
            </p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold">Evolution API</h3>
            {health && getStatusIcon(health.services.evolution_api)}
          </div>
          <p className={cn("text-sm", health && getStatusColor(health.services.evolution_api))}>
            {health?.services.evolution_api ? 'Online' : 'Offline'}
          </p>
          {health?.details.evolution_api?.state && (
            <p className="text-xs text-gray-500 mt-1">
              Estado: {health.details.evolution_api.state}
            </p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">n8n</h3>
            {health && getStatusIcon(health.services.n8n)}
          </div>
          <p className={cn("text-sm", health && getStatusColor(health.services.n8n))}>
            {health?.services.n8n ? 'Configurado' : 'Não configurado'}
          </p>
        </div>
      </div>

      {/* Sincronização de Dados */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Sincronização de Dados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'contacts' as const, label: 'Contatos', icon: '👥' },
            { type: 'chats' as const, label: 'Conversas', icon: '💬' },
            { type: 'messages' as const, label: 'Mensagens', icon: '📱' },
            { type: 'all' as const, label: 'Todos', icon: '🔄' }
          ].map(({ type, label, icon }) => (
            <div key={type} className="text-center">
              <button
                onClick={() => handleSync(type)}
                disabled={syncLoading === type}
                className={cn(
                  "w-full p-4 rounded-lg border-2 border-dashed transition-colors",
                  syncLoading === type 
                    ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-gray-300 dark:border-gray-600 hover:border-primary-500"
                )}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-medium">{label}</div>
                {syncLoading === type && (
                  <div className="flex items-center justify-center mt-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </button>
              
              {syncResults[type] && (
                <div className={cn(
                  "mt-2 p-2 rounded text-xs",
                  syncResults[type].success 
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                )}>
                  {syncResults[type].success 
                    ? `✅ Sucesso: ${JSON.stringify(syncResults[type].result)}`
                    : `❌ Erro: ${syncResults[type].error}`
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ações Administrativas */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Ações do Sistema</h3>
        <div className="space-y-4">
          <button
            onClick={handleRecalculateMetrics}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Recalcular Métricas
          </button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>• Recalcular métricas: Atualiza todas as estatísticas do dashboard</p>
            <p>• Sincronização: Busca dados mais recentes da Evolution API</p>
            <p>• Health Check: Verifica status de todos os serviços conectados</p>
          </div>
        </div>
      </div>

      {/* Informações do Sistema */}
      {health && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Status Geral:</strong>
              <span className={cn(
                "ml-2",
                health.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              )}>
                {health.status === 'healthy' ? '✅ Saudável' : '⚠️ Degradado'}
              </span>
            </div>
            <div>
              <strong>Última Verificação:</strong>
              <span className="ml-2 text-gray-500">
                {new Date(health.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <strong>Evolution API URL:</strong>
              <span className="ml-2 text-gray-500 text-xs">
                {process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'Configurado'}
              </span>
            </div>
            <div>
              <strong>Instância:</strong>
              <span className="ml-2 text-gray-500">
                {process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE_NAME || 'Configurado'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 