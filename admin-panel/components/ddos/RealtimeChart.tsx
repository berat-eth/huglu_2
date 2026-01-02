'use client'

import React, { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTheme } from '@/lib/ThemeContext'
import { Activity, TrendingUp } from 'lucide-react'
import { DDoSMetric } from '@/lib/services/ddos-api'

interface RealtimeChartProps {
  metrics: DDoSMetric[]
  title?: string
  height?: number
}

export default function RealtimeChart({ metrics, title = 'Gerçek Zamanlı Metrikler', height = 300 }: RealtimeChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className={`rounded-xl shadow-lg p-3 ${isDark ? 'bg-slate-800 text-slate-100 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
        <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={metrics}>
          <defs>
            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
          <XAxis 
            dataKey="timeSlot" 
            stroke={isDark ? '#cbd5e1' : '#94a3b8'}
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
            }}
          />
          <YAxis stroke={isDark ? '#cbd5e1' : '#94a3b8'} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="requestCount" 
            stroke="#3b82f6" 
            fill="url(#colorRequests)" 
            name="İstek Sayısı"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="attackCount" 
            stroke="#ef4444" 
            fill="url(#colorAttacks)" 
            name="Saldırı Sayısı"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="blockedCount" 
            stroke="#f59e0b" 
            fill="url(#colorBlocked)" 
            name="Engellenen"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

