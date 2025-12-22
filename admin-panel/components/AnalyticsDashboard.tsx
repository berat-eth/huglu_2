'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Activity, Eye, MousePointer, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { analyticsService } from '@/lib/services/analyticsService'
import { useTheme } from '@/lib/ThemeContext'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe']

export default function AnalyticsDashboard() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ days: 30 })
  const [overview, setOverview] = useState<any>(null)
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadRealtimeMetrics()
    }, 30000)

    return () => clearInterval(interval)
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewData, revenueData, productsData] = await Promise.all([
        analyticsService.getEcommerceOverview(undefined, undefined, dateRange.days),
        analyticsService.getRevenue(undefined, undefined, dateRange.days),
        analyticsService.getProducts(undefined, undefined, dateRange.days, 5)
      ])

      setOverview(overviewData.data)
      setRevenueTrend(revenueData.data || [])
      setProducts(productsData.data || [])
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRealtimeMetrics = async () => {
    try {
      const data = await analyticsService.getRealtimeOverview(60)
      setRealtimeMetrics(data.data)
    } catch (error) {
      console.error('Error loading realtime metrics:', error)
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

  const topProductsData = products.slice(0, 5).map((p: any) => ({
    name: p.productName?.substring(0, 20) || `Ürün ${p.productId}`,
    value: p.revenue || 0
  }))

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Analitik Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Genel performans metrikleri ve trendler</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange.days}
            onChange={(e) => setDateRange({ days: parseInt(e.target.value) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-lg border border-green-200 dark:border-green-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Toplam Gelir</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {overview?.totalRevenue?.toFixed(2) || 0} ₺
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400">+12.5%</span>
              </div>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Toplam Sipariş</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {overview?.totalOrders || 0}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">+8.2%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Ortalama Sipariş</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {overview?.avgOrderValue?.toFixed(2) || 0} ₺
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-purple-600 dark:text-purple-400">-2.1%</span>
              </div>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Canlı Kullanıcılar</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                {realtimeMetrics?.liveUsers || 0}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">Son 1 saat</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Activity className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gelir Trendi</h2>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                className="dark:text-gray-400"
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
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
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8884d8" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                name="Gelir (₺)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">En Çok Satılan Ürünler</h2>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          {topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProductsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topProductsData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              Veri bulunamadı
            </div>
          )}
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sepet Dönüşüm Oranı</h2>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-500 mb-2">
              {overview?.cartConversionRate?.toFixed(2) || 0}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ürün Görüntüleme → Sepete Ekleme</p>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overview?.cartConversionRate || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Checkout Dönüşüm Oranı</h2>
            <ShoppingCart className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-500 mb-2">
              {overview?.checkoutConversionRate?.toFixed(2) || 0}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sepete Ekleme → Satın Alma</p>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overview?.checkoutConversionRate || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ürün Görüntüleme</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.productViews || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sepete Ekleme</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.addToCart || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Satın Alma</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.purchase || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
