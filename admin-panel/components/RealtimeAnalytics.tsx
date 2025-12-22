'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Eye, TrendingUp, Clock, MapPin, Smartphone, Monitor } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { analyticsService } from '@/lib/services/analyticsService'
import { useTheme } from '@/lib/ThemeContext'

export default function RealtimeAnalytics() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [overviewData, usersData, eventsData] = await Promise.all([
        analyticsService.getRealtimeOverview(60),
        analyticsService.getRealtimeUsers(100),
        analyticsService.getRealtimeEvents(50)
      ])

      setOverview(overviewData.data)
      setUsers(usersData.data?.sessions || [])
      setEvents(eventsData.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading realtime data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-red-500 animate-pulse" />
            Gerçek Zamanlı Analitik
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Canlı kullanıcı aktiviteleri ve metrikler</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Canlı</span>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Canlı Kullanıcılar</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{overview?.liveUsers || 0}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Son 5 dakika</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-lg border border-green-200 dark:border-green-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Aktif Session'lar</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{overview?.activeSessions || 0}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Şu anda aktif</p>
            </div>
            <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Event Sayısı</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{overview?.eventsCount || 0}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Son 1 saat</p>
            </div>
            <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Canlı Gelir</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                {overview?.revenue?.toFixed(2) || 0} ₺
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Son 1 saat</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Active Sessions and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Aktif Session'lar
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{users.length} aktif</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {users.length > 0 ? (
              users.map((session: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {session.id.substring(0, 12)}...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {session.userId && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            User: {session.userId}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {session.pageViews} sayfa
                        </span>
                        {session.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {session.lastActivity && new Date(session.lastActivity).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aktif session bulunamadı
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Son Eventler
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{events.length} event</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length > 0 ? (
              events.map((event: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          event.eventType === 'purchase' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          event.eventType === 'add_to_cart' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          event.eventType === 'product_view' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                        }`}>
                          {event.eventType}
                        </span>
                        {event.productId && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Product: {event.productId}
                          </span>
                        )}
                      </div>
                      {event.screenName && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {event.screenName}
                        </p>
                      )}
                      {event.amount && (
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                          {event.amount.toFixed(2)} ₺
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Event bulunamadı
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
