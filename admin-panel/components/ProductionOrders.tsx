'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Package, Calendar, User, CheckCircle, Clock, AlertCircle, X, RefreshCw, Trash2, Edit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

export default function ProductionOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    plannedStart: '',
    plannedEnd: '',
    importance_level: 'Orta',
    notes: ''
  })

  const loadOrders = async () => {
    setLoading(true)
    try {
      const result = await api.get<any>('/admin/production-orders')
      if ((result as any)?.success) {
        setOrders((result as any).data || [])
      }
    } catch (e: any) {
      console.error('Üretim emirleri yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleCreate = async () => {
    setError(null)
    const productId = parseInt(String(form.productId || '').trim(), 10)
    const quantity = parseInt(String(form.quantity || '').trim(), 10)
    if (!productId || !quantity || quantity < 1) {
      setError('Ürün ID ve adet zorunludur')
      return
    }
    setSubmitting(true)
    try {
      await api.post<any>('/admin/production-orders', {
        productId,
        quantity,
        status: 'planned',
        plannedStart: form.plannedStart || null,
        plannedEnd: form.plannedEnd || null,
        warehouseId: null,
        importance_level: form.importance_level,
        notes: form.notes || null
      })
      setShowCreate(false)
      setForm({ productId: '', quantity: '', plannedStart: '', plannedEnd: '', importance_level: 'Orta', notes: '' })
      await loadOrders()
      if (typeof window !== 'undefined') {
        window.alert('Üretim emri oluşturuldu')
      }
    } catch (e: any) {
      setError(e?.message || 'Üretim emri oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu üretim emrini silmek istediğinize emin misiniz?')) return
    try {
      await api.delete<any>(`/admin/production-orders/${id}`)
      await loadOrders()
      if (typeof window !== 'undefined') {
        window.alert('Üretim emri silindi')
      }
    } catch (e: any) {
      alert('Silme işlemi başarısız: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const statusColors: Record<string, string> = {
    'planned': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
    'in_progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'delayed': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  const statusLabels: Record<string, string> = {
    'planned': 'Planlandı',
    'in_progress': 'Devam Ediyor',
    'completed': 'Tamamlandı',
    'delayed': 'Gecikmiş',
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('tr-TR')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Üretim Emirleri</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Üretim emirlerini takip edin</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium"
          >
            Yeni Emir Oluştur
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Aktif Üretim Emirleri</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Henüz üretim emri bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-mono text-sm font-bold">
                        #{order.id}
                      </span>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">{order.productName || `Ürün #${order.productId}`}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-gray-400 mb-3 flex-wrap">
                      <span className="flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        {order.quantity} Adet
                      </span>
                      {order.plannedStart && (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(order.plannedStart)} - {formatDate(order.plannedEnd)}
                        </span>
                      )}
                      {order.importance_level && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                          {order.importance_level}
                        </span>
                      )}
                    </div>
                    {order.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{order.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${statusColors[order.status] || statusColors.planned}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Emir Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700"
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold text-slate-800 dark:text-white">Yeni Üretim Emri</h4>
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300" onClick={() => setShowCreate(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Ürün ID</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    placeholder="Örn: 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Adet</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="Örn: 100"
                    min={1}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Planlanan Başlangıç</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.plannedStart}
                      onChange={(e) => setForm({ ...form, plannedStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Planlanan Bitiş</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.plannedEnd}
                      onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Önem Seviyesi</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.importance_level}
                    onChange={(e) => setForm({ ...form, importance_level: e.target.value })}
                  >
                    <option value="Düşük">Düşük</option>
                    <option value="Orta">Orta</option>
                    <option value="Yüksek">Yüksek</option>
                    <option value="Kritik">Kritik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Notlar</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Opsiyonel açıklama"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Vazgeç
                </button>
                <button
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
