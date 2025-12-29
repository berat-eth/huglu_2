'use client'

import { useState, useEffect } from 'react'
import { PackageCheck, TrendingUp, Activity, AlertTriangle, Factory, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function ProductionTracking() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [steps, setSteps] = useState<Record<number, any[]>>({})

  const loadOrders = async () => {
    setLoading(true)
    try {
      const result = await api.get<any>('/admin/production-orders')
      if ((result as any)?.success) {
        const ordersData = (result as any).data || []
        setOrders(ordersData)
        // Her emir için adımları yükle
        for (const order of ordersData) {
          if (order.id) {
            await loadSteps(order.id)
          }
        }
      }
    } catch (e: any) {
      console.error('Üretim emirleri yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadSteps = async (orderId: number) => {
    try {
      const result = await api.get<any>(`/admin/production-orders/${orderId}/steps`)
      if ((result as any)?.success) {
        setSteps(prev => ({ ...prev, [orderId]: (result as any).data || [] }))
      }
    } catch (e: any) {
      console.error(`Üretim adımları yüklenemedi (${orderId}):`, e)
    }
  }

  useEffect(() => {
    loadOrders()
    // Her 30 saniyede bir yenile
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'pending':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in_progress':
        return <Clock className="w-4 h-4" />
      default:
        return <XCircle className="w-4 h-4" />
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateProgress = (orderSteps: any[]) => {
    if (!orderSteps || orderSteps.length === 0) return 0
    const completed = orderSteps.filter(s => s.status === 'completed').length
    return Math.round((completed / orderSteps.length) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Üretim Takibi</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Gerçek zamanlı üretim verilerini izleyin</p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Canlı Üretim Durumu</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Henüz üretim emri bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const orderSteps = steps[order.id] || []
              const progress = calculateProgress(orderSteps)
              const isExpanded = selectedOrder === order.id

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-mono text-sm font-bold">
                          #{order.id}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">{order.productName || `Ürün #${order.productId}`}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center">
                          <PackageCheck className="w-4 h-4 mr-1" />
                          {order.quantity} Adet
                        </span>
                        {order.importance_level && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                            {order.importance_level}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'planned' ? 'Planlandı' : order.status === 'in_progress' ? 'Devam Ediyor' : order.status === 'completed' ? 'Tamamlandı' : order.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setSelectedOrder(null)
                        } else {
                          setSelectedOrder(order.id)
                          if (orderSteps.length === 0) {
                            loadSteps(order.id)
                          }
                        }
                      }}
                      className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {isExpanded ? 'Gizle' : 'Detaylar'}
                    </button>
                  </div>

                  {orderSteps.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">İlerleme</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500 dark:bg-green-400' : progress >= 50 ? 'bg-blue-500 dark:bg-blue-400' : 'bg-yellow-500 dark:bg-yellow-400'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600"
                    >
                      <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Üretim Adımları</h5>
                      {orderSteps.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Henüz adım tanımlanmamış</p>
                      ) : (
                        <div className="space-y-2">
                          {orderSteps.map((step, stepIndex) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                  {step.sequence}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-slate-800 dark:text-white">{step.stepName}</p>
                                  {step.startedAt && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Başlangıç: {formatDate(step.startedAt)}
                                    </p>
                                  )}
                                  {step.finishedAt && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Bitiş: {formatDate(step.finishedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(step.status)}`}>
                                {getStatusIcon(step.status)}
                                {step.status === 'completed' ? 'Tamamlandı' : step.status === 'in_progress' ? 'Devam Ediyor' : 'Beklemede'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
