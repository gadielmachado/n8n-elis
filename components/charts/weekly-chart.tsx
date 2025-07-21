'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { WeeklyData } from '@/types'

interface WeeklyChartProps {
  data: WeeklyData[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Conversas da Semana
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="day" 
              stroke="#6B7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="conversations" 
              stroke="#1DB954" 
              strokeWidth={3}
              dot={{ fill: '#1DB954', strokeWidth: 2, r: 4 }}
              name="Conversas"
              animationDuration={1000}
            />
            <Line 
              type="monotone" 
              dataKey="responses" 
              stroke="#86efac" 
              strokeWidth={3}
              dot={{ fill: '#86efac', strokeWidth: 2, r: 4 }}
              name="Respostas"
              animationDuration={1200}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 