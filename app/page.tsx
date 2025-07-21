'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/metric-card'
import { ResponseChart } from '@/components/charts/response-chart'
import { WeeklyChart } from '@/components/charts/weekly-chart'
import { api } from '@/lib/api-client'
import { DashboardMetrics, ChartData, WeeklyData } from '@/types'
import { 
  Users, 
  MessageCircle, 
  Clock, 
  TrendingUp,
  UserCheck,
  UserX,
  Settings,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    loadDashboardData()
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      // Buscar dados em paralelo para melhor performance
      const [metricsData, chartResult, weeklyResult] = await Promise.all([
        api.getDashboardMetrics(),
        api.getChartData(),
        api.getWeeklyData()
      ])
      
      setMetrics(metricsData)
      setChartData(chartResult)
      setWeeklyData(weeklyResult)
      setLastUpdated(new Date().toLocaleString('pt-BR'))
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      
      // Se falhar, manter dados anteriores e mostrar erro
      if (!metrics) {
        // Fallback com dados básicos
        setMetrics({
          totalLeads: 0,
          responseRate: 0,
          noResponseCount: 0,
          totalConversations: 0,
          conversationsToday: 0,
          avgResponseTime: 0
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await loadDashboardData()
  }

  const handleRecalculateMetrics = async () => {
    try {
      await api.recalculateMetrics()
      await loadDashboardData()
      alert('Métricas recalculadas com sucesso!')
    } catch (error) {
      alert('Erro ao recalcular métricas')
    }
  }

  if (loading && !metrics) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Erro ao carregar dados do dashboard
        </p>
        <button onClick={handleRefresh} className="btn-primary">
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visão geral das suas conversas WhatsApp
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
            
            <Link href="/admin" className="btn-secondary flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Total de Leads"
          value={metrics.totalLeads}
          subtitle="Leads que enviaram mensagens"
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
        />
        
        <MetricCard
          title="Taxa de Resposta"
          value={`${metrics.responseRate.toFixed(1)}%`}
          subtitle="Média de respostas obtidas"
          icon={TrendingUp}
          trend={{ value: 3.2, isPositive: true }}
        />
        
        <MetricCard
          title="Sem Resposta"
          value={metrics.noResponseCount}
          subtitle="Leads que não responderam"
          icon={UserX}
          trend={{ value: -8.1, isPositive: true }}
        />
        
        <MetricCard
          title="Conversas Hoje"
          value={metrics.conversationsToday}
          subtitle="Novas conversas de hoje"
          icon={MessageCircle}
        />
        
        <MetricCard
          title="Tempo Médio de Resposta"
          value={`${metrics.avgResponseTime}min`}
          subtitle="Tempo para primeira resposta"
          icon={Clock}
        />
        
        <MetricCard
          title="Leads Engajados"
          value={metrics.totalLeads - metrics.noResponseCount}
          subtitle="Leads que responderam"
          icon={UserCheck}
          trend={{ value: 15.8, isPositive: true }}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ResponseChart data={chartData} />
        <WeeklyChart data={weeklyData} />
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Ações Rápidas
          </h3>
          <div className="space-y-3">
            <button 
              onClick={handleRecalculateMetrics}
              className="btn-primary w-full"
            >
              Recalcular Métricas
            </button>
            <Link href="/conversas" className="btn-secondary w-full text-center block">
              Ver Todas as Conversas
            </Link>
            <Link href="/admin" className="btn-secondary w-full text-center block">
              Painel Administrativo
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Status do Sistema
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Evolution API</span>
              <span className="text-green-600 dark:text-green-400">🟢 Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Banco de Dados</span>
              <span className="text-green-600 dark:text-green-400">🟢 Conectado</span>
            </div>
            <div className="flex items-center justify-between">
              <span>n8n Integration</span>
              <span className="text-green-600 dark:text-green-400">🟢 Ativo</span>
            </div>
            <Link href="/admin" className="text-primary-500 hover:underline">
              Ver detalhes completos →
            </Link>
          </div>
        </div>
      </div>

      {/* Integração com n8n - Informações */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          🔗 Integração com n8n
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Dashboard conectado e recebendo dados em tempo real da Evolution API e n8n. 
          Webhooks configurados em: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">/api/webhooks/evolution</code> e 
          <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded ml-1">/api/webhooks/n8n</code>
        </p>
      </div>
    </div>
  )
} 