'use client'

import React from 'react'
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { DDoSAttack } from '@/lib/services/ddos-api'
import { useTheme } from '@/lib/ThemeContext'

interface AttackListProps {
  attacks: DDoSAttack[]
  onAttackClick?: (attack: DDoSAttack) => void
  loading?: boolean
}

export default function AttackList({ attacks, onAttackClick, loading }: AttackListProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    }
  }

  const getAttackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'http_flood': 'HTTP Flood',
      'slowloris': 'Slowloris',
      'syn_flood': 'SYN Flood',
      'application_layer': 'Application Layer'
    }
    return labels[type] || type
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (attacks.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
          <Shield className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Saldırı bulunamadı</p>
          <p className="text-sm mt-2">Son 24 saatte saldırı tespit edilmedi</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Son Saldırılar</h3>
        </div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {attacks.map((attack) => (
          <div
            key={attack.id}
            onClick={() => onAttackClick?.(attack)}
            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
              isDark ? 'border-slate-700' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{attack.ip}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(attack.severity)}`}>
                    {attack.severity.toUpperCase()}
                  </span>
                  {attack.blocked && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      Engellendi
                    </span>
                  )}
                  {attack.autoBlocked && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                      Otomatik
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    {getAttackTypeLabel(attack.attackType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {attack.requestCount} istek
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(attack.startTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

