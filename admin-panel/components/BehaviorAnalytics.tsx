'use client'

import { useEffect, useState } from 'react'
import { MousePointer, Clock, Eye, Navigation, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { analyticsService } from '@/lib/services/analyticsService'
import { useTheme } from '@/lib/ThemeContext'

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  try {
    if (value === null || value === undefined || value === '') return '0'
    // Eğer zaten bir sayı ise direkt kullan
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals)
    }
    // String ise parse et
    if (typeof value === 'string') {
      const num = parseFloat(value)
      if (isNaN(num)) return '0'
      return num.toFixed(decimals)
    }
    // Diğer durumlarda Number'a çevir
    const num = Number(value)
    if (isNaN(num)) return '0'
    return num.toFixed(decimals)
  } catch (error) {
    console.error('formatNumber error:', error, 'value:', value)
    return '0'
  }
}

// Helper function to safely get number value
const getNumber = (value: any, defaultValue: number = 0): number => {
  try {
    if (value === null || value === undefined || value === '') return defaultValue
    // Eğer zaten bir sayı ise direkt kullan
    if (typeof value === 'number' && !isNaN(value)) {
      return value
    }
    // String ise parse et
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? defaultValue : num
    }
    // Diğer durumlarda Number'a çevir
    const num = Number(value)
    return isNaN(num) ? defaultValue : num
  } catch (error) {
    console.error('getNumber error:', error, 'value:', value)
    return defaultValue
  }
}

export default function BehaviorAnalytics() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any>(null)
  const [screens, setScreens] = useState<any[]>([])
  const [navigation, setNavigation] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({ days: 30 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [sessionsData, screensData, navigationData] = await Promise.all([
        analyticsService.getSessions(undefined, undefined, dateRange.days),
        analyticsService.getScreens(undefined, undefined, dateRange.days, 20),
        analyticsService.getNavigation(undefined, undefined, dateRange.days)
      ])

      // API response formatını kontrol et
      setSessions(sessionsData?.data || sessionsData || {})
      setScreens(screensData?.data || screensData || [])
      setNavigation(navigationData?.data || navigationData || [])
    } catch (error: any) {
      console.error('Error loading behavior analytics:', error)
      setError(error?.message || 'Veriler yüklenirken bir hata oluştu')
    } finally {
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Hata</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  const conversionRate = getNumber(sessions?.totalSessions) > 0
    ? formatNumber((getNumber(sessions?.convertedSessions) / getNumber(sessions?.totalSessions)) * 100, 2)
    : '0'

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MousePointer className="w-8 h-8 text-purple-500" />
            Davranış Analitiği
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Kullanıcı davranışları ve navigasyon analizi</p>
        </div>
        <select
          value={dateRange.days}
          onChange={(e) => setDateRange({ days: parseInt(e.target.value) })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={7}>Son 7 Gün</option>
          <option value={30}>Son 30 Gün</option>
          <option value={90}>Son 90 Gün</option>
        </select>
      </div>

      {/* Session Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Ortalama Session Süresi</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {Math.floor(getNumber(sessions?.avgDuration))} sn
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-lg border border-green-200 dark:border-green-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Ortalama Sayfa Görüntüleme</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {formatNumber(sessions?.avgPageViews, 1)}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Dönüşüm Oranı</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {conversionRate}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Screens Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            En Çok Görüntülenen Ekranlar
          </h2>
        </div>
        {screens.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={screens.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis 
                dataKey="screenName" 
                stroke="#6b7280"
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#fff' : '#000'
                }}
              />
              <Legend />
              <Bar dataKey="views" fill="#8884d8" name="Görüntülenme" />
              <Bar dataKey="uniqueUsers" fill="#82ca9d" name="Benzersiz Kullanıcı" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Ekran verisi bulunamadı
          </div>
        )}
      </div>

      {/* Screens Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-purple-500" />
            Ekran Detayları
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Ekran</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Görüntülenme</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Benzersiz Kullanıcı</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Ortalama Süre</th>
              </tr>
            </thead>
            <tbody>
              {screens.length > 0 ? (
                screens.map((screen: any, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-white">
                      {screen.screenName}
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {screen.views || 0}
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {screen.uniqueUsers || 0}
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {screen.avgTimeOnScreen ? `${Math.floor(getNumber(screen.avgTimeOnScreen))} sn` : 'N/A'}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Ekran verisi bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
