'use client'

import React from 'react'
import { X, Shield, AlertTriangle, Clock, Activity, Globe, FileText } from 'lucide-react'
import { DDoSAttackDetail } from '@/lib/services/ddos-api'
import { useTheme } from '@/lib/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

interface AttackDetailsProps {
  attack: DDoSAttackDetail | null
  onClose: () => void
}

export default function AttackDetails({ attack, onClose }: AttackDetailsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!attack) return null

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl ${
            isDark ? 'bg-slate-800' : 'bg-white'
          }`}
        >
          <div className="sticky top-0 z-10 p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Saldırı Detayları</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Genel Bilgiler */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">IP Adresi</span>
                </div>
                <p className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-200">{attack.ip}</p>
              </div>

              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldırı Tipi</span>
                </div>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{attack.attackType}</p>
              </div>

              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">İstek Sayısı</span>
                </div>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{attack.requestCount}</p>
              </div>

              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Şiddet</span>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-semibold border ${getSeverityColor(attack.severity)}`}>
                  {attack.severity.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Zaman Bilgileri */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Zaman Bilgileri</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Başlangıç:</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(attack.startTime)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Bitiş:</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(attack.endTime)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Oluşturulma:</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(attack.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Durum:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {attack.blocked && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        Engellendi
                      </span>
                    )}
                    {attack.autoBlocked && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        Otomatik Engellendi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detaylar */}
            {attack.details && (
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Detaylar</h3>
                </div>
                <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                  {JSON.stringify(attack.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Loglar */}
            {attack.logs && attack.logs.length > 0 && (
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Saldırı Logları ({attack.logs.length})</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attack.logs.map((log, index) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.endpoint}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.responseCode >= 400
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {log.responseCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>{log.method}</span>
                        <span>{log.responseTime}ms</span>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

