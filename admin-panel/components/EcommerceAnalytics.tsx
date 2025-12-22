'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, TrendingUp, Package, DollarSign, Eye, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts'
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

export default function EcommerceAnalytics() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [revenue, setRevenue] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({ days: 30 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [overviewData, revenueData, productsData] = await Promise.all([
        analyticsService.getEcommerceOverview(undefined, undefined, dateRange.days),
        analyticsService.getRevenue(undefined, undefined, dateRange.days),
        analyticsService.getProducts(undefined, undefined, dateRange.days, 10)
      ])

      // API response formatını kontrol et
      setOverview(overviewData?.data || overviewData || {})
      setRevenue(revenueData?.data || revenueData || [])
      setProducts(productsData?.data || productsData || [])
    } catch (error: any) {
      console.error('Error loading ecommerce data:', error)
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-blue-500" />
            E-Ticaret Analitiği
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Satış performansı ve ürün metrikleri</p>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Gelir</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(overview?.totalRevenue, 2)} ₺
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.totalOrders || 0}
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ortalama Sipariş</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(overview?.avgOrderValue, 2)} ₺
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dönüşüm Oranı</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(overview?.checkoutConversionRate, 2)}%
              </p>
            </div>
            <Eye className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gelir Trendi</h2>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#6b7280"
              tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
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
            <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Sipariş Sayısı" />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} name="Gelir (₺)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            En Çok Satılan Ürünler
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Ürün</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Görüntülenme</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sepete Ekleme</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Satış</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Gelir</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Dönüşüm</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product: any, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {product.productName || `Ürün ${product.productId}`}
                      </div>
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {product.views || 0}
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {product.addToCart || 0}
                    </td>
                    <td className="text-right p-3 text-gray-700 dark:text-gray-300">
                      {product.purchases || 0}
                    </td>
                    <td className="text-right p-3 font-semibold text-green-600 dark:text-green-400">
                      {formatNumber(product.revenue, 2)} ₺
                    </td>
                    <td className="text-right p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        getNumber(product.conversionRate) > 5 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        getNumber(product.conversionRate) > 2 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {formatNumber(product.conversionRate, 2)}%
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Ürün verisi bulunamadı
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
