'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Search, Filter, CheckCircle, XCircle, Clock, Wallet, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function ReturnRequests() {
  const [returns, setReturns] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<{ id: number; action: string; userId: number; amount: number } | null>(null)

  const fetchReturns = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/return-requests?limit=100')
      if ((res as any)?.success && (res as any).data) setReturns((res as any).data)
      else setReturns([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İade talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReturns() }, [])

  const handleStatusUpdate = async (id: number, status: string, userId: number, refundAmount: number) => {
    if (status === 'approved') {
      setSelectedAction({ id, action: 'approve', userId, amount: refundAmount })
      setShowConfirmModal(true)
    } else if (status === 'rejected') {
      setSelectedAction({ id, action: 'reject', userId, amount: refundAmount })
      setShowConfirmModal(true)
    }
  }

  const confirmAction = async () => {
    if (!selectedAction) return

    try {
      setProcessingId(selectedAction.id)
      setError(null)

      // Update return request status
      const status = selectedAction.action === 'approve' ? 'approved' : 'rejected'
      await api.put(`/admin/return-requests/${selectedAction.id}/status`, { status })

      // If approved, transfer refund amount to wallet
      if (selectedAction.action === 'approve' && selectedAction.amount > 0) {
        await api.post('/admin/wallets/add', {
          userId: selectedAction.userId,
          amount: selectedAction.amount,
          description: `İade talebi #${selectedAction.id} onaylandı - İade tutarı`
        })
      }

      // Refresh list
      await fetchReturns()
      setShowConfirmModal(false)
      setSelectedAction(null)
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız oldu')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRefundToWallet = async (id: number, userId: number, refundAmount: number) => {
    if (!confirm(`İade tutarı (₺${Number(refundAmount).toFixed(2)}) kullanıcının cüzdanına aktarılacak. Devam etmek istiyor musunuz?`)) {
      return
    }

    try {
      setProcessingId(id)
      setError(null)

      await api.post('/admin/wallets/add', {
        userId,
        amount: refundAmount,
        description: `İade talebi #${id} - İade tutarı`
      })

      // Update return request status to completed
      await api.put(`/admin/return-requests/${id}/status`, { status: 'completed' })

      await fetchReturns()
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'İade tutarı aktarılamadı')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
      case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'Onaylandı'
      case 'pending': return 'Beklemede'
      case 'rejected': return 'Reddedildi'
      case 'completed': return 'Tamamlandı'
      case 'cancelled': return 'İptal Edildi'
      default: return status || 'Bilinmeyen'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">İade Talepleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşteri iade taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="İade ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 dark:text-white">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : (
        <div className="space-y-3">
          {returns
            .filter(r => `${r.customerName||''} ${r.orderId||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((returnReq, index) => (
            <motion.div
              key={returnReq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-4 flex-1">
                  <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{returnReq.customerName || 'İsimsiz Müşteri'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş: #{returnReq.orderId}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Sebep: {returnReq.reason || 'Belirtilmemiş'}</p>
                    {returnReq.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{returnReq.description}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {returnReq.requestDate || returnReq.createdAt ? new Date(returnReq.requestDate || returnReq.createdAt).toLocaleDateString('tr-TR') : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
                      ₺{returnReq.refundAmount != null ? Number(returnReq.refundAmount).toFixed(2) : '0.00'}
                    </p>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(returnReq.status)}`}>
                      {getStatusLabel(returnReq.status)}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  {returnReq.status?.toLowerCase() === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleStatusUpdate(returnReq.id, 'approved', returnReq.userId, returnReq.refundAmount)}
                        disabled={processingId === returnReq.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(returnReq.id, 'rejected', returnReq.userId, returnReq.refundAmount)}
                        disabled={processingId === returnReq.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Reddet
                      </button>
                    </div>
                  )}
                  
                  {returnReq.status?.toLowerCase() === 'approved' && (
                    <button
                      onClick={() => handleRefundToWallet(returnReq.id, returnReq.userId, returnReq.refundAmount)}
                      disabled={processingId === returnReq.id}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" />
                      Cüzdana Aktar
                    </button>
                  )}
                  
                  {processingId === returnReq.id && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">İşleniyor...</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {selectedAction.action === 'approve' ? 'İade Talebini Onayla' : 'İade Talebini Reddet'}
              </h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {selectedAction.action === 'approve' ? (
                <>
                  İade talebi onaylandığında <strong>₺{Number(selectedAction.amount).toFixed(2)}</strong> tutarındaki iade miktarı otomatik olarak kullanıcının cüzdanına aktarılacaktır.
                </>
              ) : (
                <>
                  Bu iade talebini reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedAction(null)
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                onClick={confirmAction}
                disabled={processingId !== null}
                className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedAction.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {selectedAction.action === 'approve' ? 'Onayla ve Cüzdana Aktar' : 'Reddet'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
