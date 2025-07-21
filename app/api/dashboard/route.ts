import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { DashboardMetrics, ChartData, WeeklyData } from '@/types'

// GET - Buscar métricas do dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Buscar métricas do dia
    let { data: metrics } = await supabaseAdmin
      .from('dashboard_metrics')
      .select('*')
      .eq('date', date)
      .single()

    // Se não existir, calcular métricas em tempo real
    if (!metrics) {
      await supabaseAdmin.rpc('calculate_daily_metrics', { target_date: date })
      
      const { data: newMetrics } = await supabaseAdmin
        .from('dashboard_metrics')
        .select('*')
        .eq('date', date)
        .single()
      
      metrics = newMetrics
    }

    // Buscar dados para gráficos
    const chartData = await getChartData()
    const weeklyData = await getWeeklyData()

    const dashboardData: DashboardMetrics = {
      totalLeads: metrics?.total_leads || 0,
      responseRate: metrics?.response_rate || 0,
      noResponseCount: metrics?.no_response_count || 0,
      totalConversations: metrics?.total_conversations || 0,
      conversationsToday: metrics?.conversations_today || 0,
      avgResponseTime: metrics?.avg_response_time || 0
    }

    return NextResponse.json({
      metrics: dashboardData,
      chartData,
      weeklyData,
      lastUpdated: metrics?.created_at || new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error)
    
    return NextResponse.json(
      { error: 'Erro ao buscar métricas do dashboard' },
      { status: 500 }
    )
  }
}

// POST - Recalcular métricas manualmente
export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Recalcular métricas
    await supabaseAdmin.rpc('calculate_daily_metrics', { target_date: targetDate })

    // Buscar métricas atualizadas
    const { data: metrics } = await supabaseAdmin
      .from('dashboard_metrics')
      .select('*')
      .eq('date', targetDate)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Métricas recalculadas com sucesso',
      metrics,
      date: targetDate
    })

  } catch (error) {
    console.error('❌ Erro ao recalcular métricas:', error)
    
    return NextResponse.json(
      { error: 'Erro ao recalcular métricas' },
      { status: 500 }
    )
  }
}

// Obter dados para gráfico de pizza (taxa de resposta)
async function getChartData(): Promise<ChartData[]> {
  try {
    // Buscar contatos que responderam vs que não responderam
    const { data: totalLeads } = await supabaseAdmin
      .from('contacts')
      .select('id')

    const { data: respondedLeads } = await supabaseAdmin
      .from('messages')
      .select('contact_id')
      .eq('from_me', false)

    const totalCount = totalLeads?.length || 0
    
    // Obter contatos únicos que responderam
    const uniqueRespondedContacts = respondedLeads ? 
      Array.from(new Set(respondedLeads.map(item => item.contact_id))) : []
    const respondedCount = uniqueRespondedContacts.length
    const noResponseCount = totalCount - respondedCount

    return [
      {
        name: 'Responderam',
        value: respondedCount,
        color: '#1DB954'
      },
      {
        name: 'Não Responderam',
        value: noResponseCount,
        color: '#ff6b6b'
      }
    ]

  } catch (error) {
    console.error('❌ Erro ao buscar dados do gráfico:', error)
    return []
  }
}

// Obter dados semanais para gráfico de linha
async function getWeeklyData(): Promise<WeeklyData[]> {
  try {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const weeklyData: WeeklyData[] = []

    // Calcular dados para os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayName = days[date.getDay()]

      // Buscar conversas do dia
      const { data: conversations } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`)

      // Buscar respostas do dia (mensagens de contatos)
      const { data: responses } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('from_me', false)
        .gte('timestamp', `${dateStr}T00:00:00`)
        .lt('timestamp', `${dateStr}T23:59:59`)

      weeklyData.push({
        day: dayName,
        conversations: conversations?.length || 0,
        responses: responses?.length || 0
      })
    }

    return weeklyData

  } catch (error) {
    console.error('❌ Erro ao buscar dados semanais:', error)
    return []
  }
} 