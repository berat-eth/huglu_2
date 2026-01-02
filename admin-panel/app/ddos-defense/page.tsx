'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Activity, TrendingUp, Ban, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import DDoSAPI, { DDoSStatus, DDoSAttack, DDoSMetric, TopAttacker, SSEEvent } from '@/lib/services/ddos-api'
import RealtimeChart from '@/components/ddos/RealtimeChart'
import AttackList from '@/components/ddos/AttackList'
import AttackDetails from '@/components/ddos/AttackDetails'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'

export default function DDoSDefensePage() {
  const [status, setStatus] = useState<DDoSStatus | null>(null)
  const [attacks, setAttacks] = useState<DDoSAttack[]>([])
  const [metrics, setMetrics] = useState<DDoSMetric[]>([])
  const [topAttackers, setTopAttackers] = useState<TopAttacker[]>([])
  const [selectedAttack, setSelectedAttack] = useState<DDoSAttack | null>(null)
  const [loading, setLoading] = useState(true)
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)
  const [sseEventSource, setSseEventSource] = useState<EventSource | null>(null)

  // İlk yükleme
  useEffect(() => {
    loadData()
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadData, 30000)
    
    return () => {
      clearInterval(interval)
      if (sseEventSource) {
        DDoSAPI.unsubscribeRealtime(sseEventSource)
      }
    }
  }, [])

  // SSE aboneliği
  useEffect(() => {
    if (realtimeEnabled) {
      const eventSource = DDoSAPI.subscribeRealtime(
        (event: SSEEvent) => {
          handleSSEEvent(event)
        },
        (error) => {
          console.error('SSE hatası:', error)
          setRealtimeEnabled(false)
        }
      )
      setSseEventSource(eventSource)
      
      return () => {
        if (eventSource) {
          DDoSAPI.unsubscribeRealtime(eventSource)
        }
      }
    } else {
      if (sseEventSource) {
        DDoSAPI.unsubscribeRealtime(sseEventSource)
        setSseEventSource(null)
      }
    }
  }, [realtimeEnabled])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Paralel istekler
      const [statusRes, attacksRes, metricsRes, topAttackersRes] = await Promise.all([
        DDoSAPI.getStatus(),
        DDoSAPI.getAttacks({ page: 1, limit: 10 }),
        DDoSAPI.getMetrics({ interval: 'hour' }),
        DDoSAPI.getTopAttackers({ limit: 5 })
      ])
      
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data)
      }
      
      if (attacksRes.success && attacksRes.data) {
        setAttacks(attacksRes.data.attacks)
      }
      
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data.metrics || [])
      } else {
        // Metrics yüklenemezse boş array set et
        setMetrics([])
      }
      
      if (topAttackersRes.success && topAttackersRes.data) {
        setTopAttackers(topAttackersRes.data.attackers)
      }
    } catch (error) {
      console.error('DDoS veri yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSSEEvent = (event: SSEEvent) => {
    // Gerçek zamanlı event'leri işle
    if (event.event === 'ip_blocked' || event.event === 'attack_detected') {
      // Verileri yeniden yükle
      loadData()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400'
      case 'good':
        return 'text-blue-600 dark:text-blue-400'
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'poor':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-red-600 dark:text-red-400'
    }
  }

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState('ddos-defense')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                DDoS Savunma Paneli
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Gerçek zamanlı saldırı izleme ve savunma yönetimi
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  realtimeEnabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                }`}
              >
                <Activity className={`w-4 h-4 ${realtimeEnabled ? 'animate-pulse' : ''}`} />
                {realtimeEnabled ? 'Canlı' : 'Canlı Değil'}
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
            </div>
          </div>

          {/* Genel Durum Kartları */}
          {status && status.attacks && status.blocked && status.requests && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Saldırı</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {status.attacks?.totalAttacks || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Son 24 saat
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Engellenen IP</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {status.blocked?.activeBlocks || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Aktif engellemeler
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Ban className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Kritik Saldırı</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {status.attacks?.criticalAttacks || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Son 24 saat
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam İstek</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {(status.requests?.totalRequests || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Son 1 saat
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Grafik */}
          {metrics.length > 0 && (
            <RealtimeChart metrics={metrics} />
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Son Saldırılar */}
            <AttackList
              attacks={attacks}
              onAttackClick={setSelectedAttack}
              loading={loading}
            />

            {/* Top Saldırganlar */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">En Aktif Saldırganlar</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {topAttackers.map((attacker, index) => (
                  <div
                    key={attacker.ip}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400">
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm text-slate-800 dark:text-slate-200">{attacker.ip}</span>
                        {attacker.isBlocked && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Engellendi
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 ml-11">
                      <span>{attacker.attackCount} saldırı</span>
                      <span>{attacker.totalRequests.toLocaleString()} istek</span>
                      <span className={`font-semibold ${
                        attacker.maxSeverity === 'critical' ? 'text-red-600 dark:text-red-400' :
                        attacker.maxSeverity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {attacker.maxSeverity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {topAttackers.length === 0 && (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Saldırgan bulunamadı</p>
                </div>
              )}
            </div>
          </div>

          {/* Saldırı Detay Modal */}
          {selectedAttack && (
            <AttackDetails
              attack={selectedAttack as any}
              onClose={() => setSelectedAttack(null)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

