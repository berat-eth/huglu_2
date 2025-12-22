'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/ThemeContext'
import { Brain, Settings, FileText, Activity, ToggleLeft, ToggleRight, Plus, Edit, Trash2, Eye, AlertCircle, CheckCircle, X, RefreshCw, Zap, Shield, TrendingUp, Clock, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FeatureFlag {
  id: number
  featureKey: string
  featureName: string
  description: string
  isEnabled: boolean
  config: any
}

interface Rule {
  id: number
  name: string
  description: string
  conditions: any[]
  actions: any[]
  priority: number
  isActive: boolean
  executionMode: 'log_only' | 'suggest_only' | 'execute'
}

interface Decision {
  id: number
  userId: number
  ruleId: number
  ruleName: string
  eventType: string
  decisionData: any
  executionMode: string
  executed: boolean
  createdAt: string
}

export default function PlatformBrain() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flags' | 'rules' | 'decisions'>('dashboard')
  const [status, setStatus] = useState<any>(null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      if (activeTab === 'dashboard') {
        const statusData = await api.get('/platform-brain/status')
        setStatus(statusData.data)
      } else if (activeTab === 'flags') {
        const flagsData = await api.get('/platform-brain/feature-flags')
        setFeatureFlags(flagsData.data)
      } else if (activeTab === 'rules') {
        const rulesData = await api.get('/platform-brain/rules')
        setRules(rulesData.data)
      } else if (activeTab === 'decisions') {
        const decisionsData = await api.get('/platform-brain/decisions', { limit: 100 })
        setDecisions(decisionsData.data)
      }
    } catch (error: any) {
      console.error('Huğlu AI veri yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFeatureFlag = async (featureKey: string, currentValue: boolean) => {
    try {
      await api.put(`/platform-brain/feature-flags/${featureKey}`, {
        isEnabled: !currentValue
      })
      await loadData()
    } catch (error: any) {
      console.error('Özellik bayrağı güncelleme hatası:', error)
      alert('Özellik bayrağı güncellenemedi: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const deleteRule = async (ruleId: number) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    
    try {
      await api.delete(`/platform-brain/rules/${ruleId}`)
      await loadData()
    } catch (error: any) {
      console.error('Kural silme hatası:', error)
      alert('Kural silinemedi: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Genel Bakış', icon: Activity },
    { id: 'flags', label: 'Özellik Bayrakları', icon: ToggleLeft },
    { id: 'rules', label: 'Kurallar', icon: FileText },
    { id: 'decisions', label: 'Karar Logları', icon: Eye }
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-blue-100 dark:border-slate-700"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl shadow-md">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Huğlu AI
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Akıllı karar alma ve otomasyon sistemi</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
        <nav className="flex gap-1 p-2 bg-gray-50 dark:bg-slate-900/50">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Yükleniyor...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <DashboardView status={status} />}
            {activeTab === 'flags' && (
              <FeatureFlagsView
                flags={featureFlags}
                onToggle={toggleFeatureFlag}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'rules' && (
              <RulesView
                rules={rules}
                onEdit={(rule) => {
                  setEditingRule(rule)
                  setShowRuleEditor(true)
                }}
                onDelete={deleteRule}
                onAdd={() => {
                  setEditingRule(null)
                  setShowRuleEditor(true)
                }}
              />
            )}
            {activeTab === 'decisions' && <DecisionsView decisions={decisions} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rule Editor Modal */}
      {showRuleEditor && (
        <RuleEditorModal
          rule={editingRule}
          onClose={() => {
            setShowRuleEditor(false)
            setEditingRule(null)
          }}
          onSave={() => {
            setShowRuleEditor(false)
            setEditingRule(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function DashboardView({ status }: { status: any }) {
  if (!status) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
        <p>Veri yüklenemedi</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Durum</p>
              <p className="text-3xl font-bold">
                {status.enabled ? 'Aktif' : 'Pasif'}
              </p>
            </div>
            {status.enabled ? (
              <CheckCircle className="w-12 h-12 text-green-100" />
            ) : (
              <AlertCircle className="w-12 h-12 text-green-100" />
            )}
          </div>
          <div className="flex items-center gap-2 text-green-100 text-sm">
            <Shield className="w-4 h-4" />
            <span>Huğlu AI {status.enabled ? 'çalışıyor' : 'devre dışı'}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Aktif Kurallar</p>
              <p className="text-3xl font-bold">{status.stats?.activeRules || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-blue-100" />
          </div>
          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <Zap className="w-4 h-4" />
            <span>Çalışan kural sayısı</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Kararlar (24s)</p>
              <p className="text-3xl font-bold">{status.stats?.decisionsLast24h || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-100" />
          </div>
          <div className="flex items-center gap-2 text-purple-100 text-sm">
            <Clock className="w-4 h-4" />
            <span>Son 24 saatteki kararlar</span>
          </div>
        </motion.div>
      </div>

      {/* Feature Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <ToggleLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Özellik Bayrakları
          </h3>
        </div>
        <div className="p-6">
          {status.featureFlags && status.featureFlags.length > 0 ? (
            <div className="space-y-3">
              {status.featureFlags.map((flag: any, index: number) => (
                <motion.div
                  key={flag.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{flag.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{flag.key}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    flag.enabled 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700' 
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600'
                  }`}>
                    {flag.enabled ? '✓ Aktif' : '✗ Pasif'}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Özellik bayrağı bulunamadı</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function FeatureFlagsView({ flags, onToggle, onRefresh }: { flags: FeatureFlag[], onToggle: (key: string, current: boolean) => void, onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ToggleLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Özellik Bayrakları
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Yenile</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Özellik</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Açıklama</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Durum</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {flags.map((flag, index) => (
                <motion.tr
                  key={flag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{flag.featureName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{flag.featureKey}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{flag.description || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      flag.isEnabled 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700' 
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600'
                    }`}>
                      {flag.isEnabled ? '✓ Aktif' : '✗ Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onToggle(flag.featureKey, flag.isEnabled)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        flag.isEnabled
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-300 dark:border-green-700'
                      }`}
                    >
                      {flag.isEnabled ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          Devre Dışı Bırak
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          Aktifleştir
                        </>
                      )}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RulesView({ rules, onEdit, onDelete, onAdd }: { rules: Rule[], onEdit: (rule: Rule) => void, onDelete: (id: number) => void, onAdd: () => void }) {
  const getExecutionModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      'log_only': 'Sadece Log',
      'suggest_only': 'Öneri Modu',
      'execute': 'Çalıştır'
    }
    return labels[mode] || mode
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Kurallar
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Yeni Kural</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-slate-700">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">Henüz kural yok</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">İlk kuralınızı oluşturmak için "Yeni Kural" butonuna tıklayın</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Kural Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{rule.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      rule.isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700' 
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600'
                    }`}>
                      {rule.isActive ? '✓ Aktif' : '✗ Pasif'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      rule.executionMode === 'execute' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700' :
                      rule.executionMode === 'suggest_only' 
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    }`}>
                      {getExecutionModeLabel(rule.executionMode)}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Öncelik: <span className="font-semibold text-gray-700 dark:text-gray-300">{rule.priority}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      Koşullar: <span className="font-semibold text-gray-700 dark:text-gray-300">{rule.conditions?.length || 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      Aksiyonlar: <span className="font-semibold text-gray-700 dark:text-gray-300">{rule.actions?.length || 0}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEdit(rule)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    title="Düzenle"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(rule.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    title="Sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionsView({ decisions }: { decisions: Decision[] }) {
  const getExecutionModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      'log_only': 'Sadece Log',
      'suggest_only': 'Öneri Modu',
      'execute': 'Çalıştır'
    }
    return labels[mode] || mode
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Karar Logları
        </h2>
      </div>

      {decisions.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-slate-700">
          <Eye className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Henüz karar logu yok</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Huğlu AI karar verdiğinde burada görünecek</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Zaman</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Kural</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Kullanıcı</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Olay</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Mod</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {decisions.map((decision, index) => (
                  <motion.tr
                    key={decision.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(decision.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{decision.ruleName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {decision.userId ? (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {decision.userId}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{decision.eventType || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        decision.executionMode === 'execute' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700' :
                        decision.executionMode === 'suggest_only' 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                      }`}>
                        {getExecutionModeLabel(decision.executionMode)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {decision.executed ? (
                        <div className="flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <X className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function RuleEditorModal({ rule, onClose, onSave }: { rule: Rule | null, onClose: () => void, onSave: () => void }) {
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [conditions, setConditions] = useState(JSON.stringify(rule?.conditions || [], null, 2))
  const [actions, setActions] = useState(JSON.stringify(rule?.actions || [], null, 2))
  const [priority, setPriority] = useState(rule?.priority || 0)
  const [isActive, setIsActive] = useState(rule?.isActive ?? true)
  const [executionMode, setExecutionMode] = useState(rule?.executionMode || 'log_only')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      let conditionsParsed, actionsParsed
      try {
        conditionsParsed = JSON.parse(conditions)
        actionsParsed = JSON.parse(actions)
      } catch (e) {
        alert('Koşullar veya aksiyonlarda geçersiz JSON formatı var')
        return
      }

      if (rule) {
        await api.put(`/platform-brain/rules/${rule.id}`, {
          name,
          description,
          conditions: conditionsParsed,
          actions: actionsParsed,
          priority,
          isActive,
          executionMode
        })
      } else {
        await api.post('/platform-brain/rules', {
          name,
          description,
          conditions: conditionsParsed,
          actions: actionsParsed,
          priority,
          isActive,
          executionMode
        })
      }
      onSave()
    } catch (error: any) {
      alert('Kural kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {rule ? 'Kuralı Düzenle' : 'Yeni Kural Oluştur'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kural Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              placeholder="Örn: Yüksek hazırlık skorlu kullanıcılar için özel teklif"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              rows={3}
              placeholder="Kuralın ne yaptığını açıklayın..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Öncelik</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Yüksek sayı = yüksek öncelik</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Çalıştırma Modu</label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              >
                <option value="log_only">Sadece Log (Güvenli)</option>
                <option value="suggest_only">Öneri Modu</option>
                <option value="execute">Çalıştır (Dikkatli!)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Kural aktif
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Koşullar (JSON) *</label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              rows={10}
              placeholder='[{"type": "readiness_score", "operator": ">=", "value": 70}]'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Geçerli JSON formatında koşulları girin</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Aksiyonlar (JSON) *</label>
            <textarea
              value={actions}
              onChange={(e) => setActions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              rows={10}
              placeholder='[{"type": "send_notification", "params": {"title": "Başlık", "message": "Mesaj"}}]'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Geçerli JSON formatında aksiyonları girin</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !conditions || !actions}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
