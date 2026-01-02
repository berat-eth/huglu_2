'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Filter, Download, Calendar, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import DDoSAPI, { DDoSAttack, DDoSAttackDetail } from '@/lib/services/ddos-api'
import AttackList from '@/components/ddos/AttackList'
import AttackDetails from '@/components/ddos/AttackDetails'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'

export default function AttackHistoryPage() {
  const [attacks, setAttacks] = useState<DDoSAttack[]>([])
  const [selectedAttack, setSelectedAttack] = useState<DDoSAttack | null>(null)
  const [attackDetail, setAttackDetail] = useState<DDoSAttackDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    severity: '',
    attackType: '',
    blocked: null as boolean | null,
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('ddos-defense')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadAttacks()
  }, [page, filters])

  const loadAttacks = async () => {
    try {
      setLoading(true)
      const response = await DDoSAPI.getAttacks({
        page,
        limit: 50,
        severity: filters.severity || undefined,
        attackType: filters.attackType || undefined,
        blocked: filters.blocked !== null ? filters.blocked : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
      
      if (response.success && response.data) {
        setAttacks(response.data.attacks)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Saldırı geçmişi yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAttackClick = async (attack: DDoSAttack) => {
    try {
      const response = await DDoSAPI.getAttack(attack.id)
      if (response.success && response.data) {
        setAttackDetail(response.data.attack)
        setSelectedAttack(attack)
      }
    } catch (error) {
      console.error('Saldırı detayı yüklenemedi:', error)
    }
  }

  const handleExport = async () => {
    try {
      // CSV export
      const csvRows = [
        ['ID', 'IP', 'Saldırı Tipi', 'Şiddet', 'İstek Sayısı', 'Başlangıç', 'Bitiş', 'Engellendi', 'Otomatik Engellendi'].join(','),
        ...attacks.map(attack => [
          attack.id,
          attack.ip,
          attack.attackType,
          attack.severity,
          attack.requestCount,
          attack.startTime,
          attack.endTime || '',
          attack.blocked ? 'Evet' : 'Hayır',
          attack.autoBlocked ? 'Evet' : 'Hayır'
        ].join(','))
      ]
      
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `ddos-attacks-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export hatası:', error)
      alert('Export başarısız: ' + (error as Error).message)
    }
  }

  const resetFilters = () => {
    setFilters({
      severity: '',
      attackType: '',
      blocked: null,
      startDate: '',
      endDate: ''
    })
    setPage(1)
  }

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
                Saldırı Geçmişi
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Tespit edilen tüm saldırıların geçmişi ve detayları
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtrele
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Dışa Aktar (CSV)
              </button>
            </div>
          </div>

          {/* Filtreler */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filtreler</h3>
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sıfırla
                </button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Şiddet
                  </label>
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Saldırı Tipi
                  </label>
                  <select
                    value={filters.attackType}
                    onChange={(e) => setFilters({ ...filters, attackType: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="http_flood">HTTP Flood</option>
                    <option value="slowloris">Slowloris</option>
                    <option value="syn_flood">SYN Flood</option>
                    <option value="application_layer">Application Layer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Engellenme Durumu
                  </label>
                  <select
                    value={filters.blocked === null ? '' : filters.blocked ? 'true' : 'false'}
                    onChange={(e) => setFilters({ ...filters, blocked: e.target.value === '' ? null : e.target.value === 'true' })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="true">Engellendi</option>
                    <option value="false">Engellenmedi</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Saldırı Listesi */}
          <AttackList
            attacks={attacks}
            onAttackClick={handleAttackClick}
            loading={loading}
          />

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <span className="px-4 py-2 text-slate-600 dark:text-slate-400">
                Sayfa {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          )}

          {/* Saldırı Detay Modal */}
          {selectedAttack && attackDetail && (
            <AttackDetails
              attack={attackDetail}
              onClose={() => {
                setSelectedAttack(null)
                setAttackDetail(null)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

