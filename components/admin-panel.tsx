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
  const [health, setHealth] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
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

  const testEvolutionConnection = async () => {
    setLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/test-evolution')
      const data = await response.json()
      setTestResult(data)
      
      if (data.success) {
        alert('✅ Conexão com Evolution API funcionando!')
      } else {
        alert(`❌ Erro na conexão: ${data.message}`)
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao testar conexão',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      alert('❌ Erro ao testar conexão')
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={checkHealth}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Verificando...' : '🔍 Verificar Saúde'}
          </button>

          <button
            onClick={testEvolutionConnection}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? 'Testando...' : '⚡ Testar Evolution API'}
          </button>

          <button
            onClick={() => handleSync('all')}
            disabled={syncLoading === 'all'}
            className="btn btn-secondary"
          >
            {syncLoading === 'all' ? 'Sincronizando...' : '🔄 Sincronizar Tudo'}
          </button>

          <button
            onClick={() => handleSync('contacts')}
            disabled={syncLoading === 'contacts'}
            className="btn btn-outline"
          >
            {syncLoading === 'contacts' ? 'Sincronizando...' : '👥 Sync Contatos'}
          </button>

          <button
            onClick={() => handleSync('chats')}
            disabled={syncLoading === 'chats'}
            className="btn btn-outline"
          >
            {syncLoading === 'chats' ? 'Sincronizando...' : '💬 Sync Conversas'}
          </button>

          <button
            onClick={() => handleSync('messages')}
            disabled={syncLoading === 'messages'}
            className="btn btn-outline"
          >
            {syncLoading === 'messages' ? 'Sincronizando...' : '📝 Sync Mensagens'}
          </button>
        </div>
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

      {/* Resultado do Teste Evolution API */}
      {testResult && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {testResult.success ? '✅ Teste Evolution API' : '❌ Teste Evolution API'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <strong>Status:</strong>
              <span className={cn(
                "ml-2",
                testResult.success ? 'text-green-600' : 'text-red-600'
              )}>
                {testResult.message}
              </span>
            </div>
            
            {testResult.results && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Detalhes dos Testes:</h4>
                
                {/* Configuração de Ambiente */}
                <div className="mb-3">
                  <strong>Variáveis de Ambiente:</strong>
                  <ul className="ml-4 mt-1">
                    <li>URL: {testResult.results.environment?.url}</li>
                    <li>Token: {testResult.results.environment?.token}</li>
                    <li>Instância: {testResult.results.environment?.instance}</li>
                  </ul>
                </div>
                
                {/* Resultados dos Testes */}
                {testResult.results.tests && Object.entries(testResult.results.tests).map(([testName, result]: [string, any]) => (
                  <div key={testName} className="mb-2">
                    <span className={cn(
                      "inline-block w-3 h-3 rounded-full mr-2",
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    )}></span>
                    <strong>{testName}:</strong> {result.success ? 'Passou' : result.error}
                  </div>
                ))}
              </div>
            )}
            
            {/* Próximos Passos */}
            {testResult.nextSteps && testResult.nextSteps.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Próximos Passos:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {testResult.nextSteps.map((step: string, index: number) => (
                    <li key={index} className="text-sm">{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 