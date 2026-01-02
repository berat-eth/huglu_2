'use client'

import { useEffect, useState } from 'react'
import { Shield, Ban, Unlock, Plus, Search, Filter, Download, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import DDoSAPI, { BlockedIP } from '@/lib/services/ddos-api'
import IPBlockTable from '@/components/ddos/IPBlockTable'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'

export default function IPManagementPage() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showBulkBlockModal, setShowBulkBlockModal] = useState(false)
  const [blockForm, setBlockForm] = useState({
    ip: '',
    reason: '',
    isPermanent: false,
    blockDuration: 3600
  })
  const [bulkIPs, setBulkIPs] = useState('')
  const [activeTab, setActiveTab] = useState('ddos-defense')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadBlockedIPs()
  }, [filterActive])

  const loadBlockedIPs = async () => {
    try {
      setLoading(true)
      const response = await DDoSAPI.getBlockedIPs({
        page: 1,
        limit: 100,
        isActive: filterActive !== null ? filterActive : undefined
      })
      
      if (response.success && response.data) {
        setBlockedIPs(response.data.blockedIPs)
      }
    } catch (error) {
      console.error('Engellenen IP\'ler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlockIP = async () => {
    try {
      const response = await DDoSAPI.blockIP({
        ip: blockForm.ip,
        reason: blockForm.reason,
        isPermanent: blockForm.isPermanent,
        blockDuration: blockForm.isPermanent ? undefined : blockForm.blockDuration
      })
      
      if (response.success) {
        setShowBlockModal(false)
        setBlockForm({ ip: '', reason: '', isPermanent: false, blockDuration: 3600 })
        loadBlockedIPs()
      }
    } catch (error) {
      console.error('IP engelleme hatası:', error)
      alert('IP engellenemedi: ' + (error as Error).message)
    }
  }

  const handleUnblockIP = async (ip: string) => {
    if (!confirm(`${ip} adresinin engellemesini kaldırmak istediğinizden emin misiniz?`)) {
      return
    }
    
    try {
      const response = await DDoSAPI.unblockIP({ ip })
      
      if (response.success) {
        loadBlockedIPs()
      }
    } catch (error) {
      console.error('IP engelleme kaldırma hatası:', error)
      alert('IP engellemesi kaldırılamadı: ' + (error as Error).message)
    }
  }

  const handleBulkBlock = async () => {
    const ips = bulkIPs.split('\n').map(ip => ip.trim()).filter(ip => ip.length > 0)
    
    if (ips.length === 0) {
      alert('Lütfen en az bir IP adresi girin')
      return
    }
    
    try {
      const response = await DDoSAPI.bulkBlockIPs({
        ips,
        reason: 'Toplu engelleme',
        isPermanent: false
      })
      
      if (response.success && response.data) {
        setShowBulkBlockModal(false)
        setBulkIPs('')
        loadBlockedIPs()
        alert(`${response.data.successful} IP başarıyla engellendi, ${response.data.failed} IP engellenemedi`)
      }
    } catch (error) {
      console.error('Toplu IP engelleme hatası:', error)
      alert('Toplu IP engelleme başarısız: ' + (error as Error).message)
    }
  }

  const filteredIPs = blockedIPs.filter(ip => {
    if (searchQuery && !ip.ip.includes(searchQuery)) {
      return false
    }
    return true
  })

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
                IP Yönetimi
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Engellenen IP'leri yönetin, yeni IP'ler engelleyin
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkBlockModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Toplu Engelleme
              </button>
              <button
                onClick={() => setShowBlockModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                IP Engelle
              </button>
            </div>
          </div>

          {/* Filtreler */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="IP adresi ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterActive === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterActive === true
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterActive === false
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  Pasif
                </button>
              </div>
            </div>
          </div>

          {/* IP Tablosu */}
          <IPBlockTable
            blockedIPs={filteredIPs}
            onUnblock={handleUnblockIP}
            loading={loading}
          />

          {/* IP Engelleme Modal */}
          {showBlockModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">IP Engelle</h2>
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      IP Adresi
                    </label>
                    <input
                      type="text"
                      value={blockForm.ip}
                      onChange={(e) => setBlockForm({ ...blockForm, ip: e.target.value })}
                      placeholder="192.168.1.1"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sebep
                    </label>
                    <input
                      type="text"
                      value={blockForm.reason}
                      onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                      placeholder="Saldırı tespit edildi"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="permanent"
                      checked={blockForm.isPermanent}
                      onChange={(e) => setBlockForm({ ...blockForm, isPermanent: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <label htmlFor="permanent" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Kalıcı engelleme
                    </label>
                  </div>
                  
                  {!blockForm.isPermanent && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Engelleme Süresi (saniye)
                      </label>
                      <input
                        type="number"
                        value={blockForm.blockDuration}
                        onChange={(e) => setBlockForm({ ...blockForm, blockDuration: parseInt(e.target.value) || 3600 })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleBlockIP}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Engelle
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Toplu IP Engelleme Modal */}
          {showBulkBlockModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Toplu IP Engelleme</h2>
                  <button
                    onClick={() => setShowBulkBlockModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      IP Adresleri (Her satıra bir IP)
                    </label>
                    <textarea
                      value={bulkIPs}
                      onChange={(e) => setBulkIPs(e.target.value)}
                      placeholder="192.168.1.1&#10;192.168.1.2&#10;192.168.1.3"
                      rows={10}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Her satıra bir IP adresi yazın. Maksimum 100 IP engellenebilir.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkBlockModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleBulkBlock}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Toplu Engelle
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

