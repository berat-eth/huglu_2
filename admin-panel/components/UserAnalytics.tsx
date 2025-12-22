'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, UserCheck, TrendingUp, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { analyticsService } from '@/lib/services/analyticsService'
import { useTheme } from '@/lib/ThemeContext'

export default function UserAnalytics() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [cohorts, setCohorts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [overviewData, cohortsData] = await Promise.all([
        analyticsService.getUserOverview(undefined, undefined, 30),
        analyticsService.getCohorts(20)
      ])

      setOverview(overviewData.data)
      setCohorts(cohortsData.data || [])
    } catch (error) {
      console.error('Error loading user analytics:', error)
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-500" />
          Kullanıcı Analitiği
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Kullanıcı segmentasyonu ve kohort analizi</p>
      </div>

      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Toplam Kullanıcı</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {overview?.totalUsers || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-lg border border-green-200 dark:border-green-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Kayıtlı Kullanıcı</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {overview?.registeredUsers || 0}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Anonim Kullanıcı</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {overview?.anonymousUsers || 0}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Session Metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Session</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.totalSessions || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ortalama Session Süresi</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(overview.avgSessionDuration || 0)} sn
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cohorts Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Kohort Analizi
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Kohort Adı</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tarih</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tür</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Toplam Kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length > 0 ? (
                cohorts.map((cohort: any, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-white">
                      {cohort.cohortName}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {new Date(cohort.cohortDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {cohort.cohortType}
                      </span>
                    </td>
                    <td className="text-right p-3 font-semibold text-gray-900 dark:text-white">
                      {cohort.totalUsers || 0}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Kohort verisi bulunamadı
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
