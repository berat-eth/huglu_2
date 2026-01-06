'use client'

import { FileText, CheckCircle, XCircle, Clock, RefreshCw, Search, Eye, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface WholesaleApplication {
  id: number
  applicationId: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  businessType: 'retail' | 'ecommerce' | 'distributor' | 'other'
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  note?: string
  createdAt: string
  updatedAt?: string
}

export default function WholesaleApplications() {
  const [applications, setApplications] = useState<WholesaleApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedApplication, setSelectedApplication] = useState<WholesaleApplication | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [note, setNote] = useState('')

  const businessTypeLabels: Record<string, string> = {
    retail: 'Perakende Mağaza',
    ecommerce: 'E-Ticaret',
    distributor: 'Distribütör',
    other: 'Diğer'
  }

  const statusLabels: Record<string, string> = {
    pending: 'Bekliyor',
    reviewing: 'İnceleniyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
  }

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (searchTerm) params.search = searchTerm

      const res = await api.get<any>('/wholesale/applications', { params })
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        setApplications((res as any).data)
      } else {
        setApplications([])
      }
    } catch (e: any) {
      setError(e?.message || 'Başvurular getirilemedi')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/wholesale/applications/${id}/status`, { status, note: note || undefined })
      await load()
      setShowModal(false)
      setSelectedApplication(null)
      setNote('')
    } catch (e: any) {
      alert('Durum güncellenemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu başvuruyu silmek istediğinizden emin misiniz?')) return
    try {
      await api.delete(`/wholesale/applications/${id}`)
      await load()
    } catch (e: any) {
      alert('Başvuru silinemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const openModal = (app: WholesaleApplication) => {
    setSelectedApplication(app)
    setNote(app.note || '')
    setShowModal(true)
  }

  const filteredApplications = applications.filter(app => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        app.companyName.toLowerCase().includes(search) ||
        app.contactPerson.toLowerCase().includes(search) ||
        app.email.toLowerCase().includes(search) ||
        app.applicationId.toLowerCase().includes(search)
      )
    }
    return true
  })

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Toptan Satış Başvuruları</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Toptan satış programı başvurularını inceleyin ve yönetin</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">İnceleniyor</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.reviewing}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Onaylanan</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Reddedilen</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Şirket, kişi, e-posta veya başvuru no ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tüm Durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="reviewing">İnceleniyor</option>
            <option value="approved">Onaylanan</option>
            <option value="rejected">Reddedilen</option>
          </select>
        </div>
      </div>

      {/* Başvurular Tablosu */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Yükleniyor...</div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        {!loading && !error && filteredApplications.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Başvuru bulunamadı
          </div>
        )}
        {!loading && !error && filteredApplications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Başvuru No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Şirket</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İş Tipi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredApplications.map((app, index) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                      {app.applicationId}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{app.companyName}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{app.contactPerson}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 dark:text-slate-300">{app.email}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{app.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {businessTypeLabels[app.businessType] || app.businessType}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(app.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          app.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : app.status === 'reviewing'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : app.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {statusLabels[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(app)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Detaylar"
                        >
                          <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        {app.status !== 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'approved')}
                            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Onayla"
                          >
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </button>
                        )}
                        {app.status !== 'rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Reddet"
                          >
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detay Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Başvuru Detayları - {selectedApplication.applicationId}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedApplication(null)
                    setNote('')
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Şirket Adı</label>
                  <div className="mt-1 text-slate-800 dark:text-slate-100">{selectedApplication.companyName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">İletişim Kişisi</label>
                  <div className="mt-1 text-slate-800 dark:text-slate-100">{selectedApplication.contactPerson}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">E-posta</label>
                  <div className="mt-1 text-slate-800 dark:text-slate-100">{selectedApplication.email}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Telefon</label>
                  <div className="mt-1 text-slate-800 dark:text-slate-100">{selectedApplication.phone}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">İş Tipi</label>
                  <div className="mt-1 text-slate-800 dark:text-slate-100">
                    {businessTypeLabels[selectedApplication.businessType] || selectedApplication.businessType}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Durum</label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        selectedApplication.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : selectedApplication.status === 'reviewing'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : selectedApplication.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {statusLabels[selectedApplication.status] || selectedApplication.status}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Not</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Not ekleyin..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handleStatusUpdate(selectedApplication.id, 'reviewing')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  İncelemeye Al
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedApplication.id, 'approved')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Onayla
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedApplication.id, 'rejected')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reddet
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

