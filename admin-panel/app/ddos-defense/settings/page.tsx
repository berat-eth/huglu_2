'use client'

import { useEffect, useState } from 'react'
import { Shield, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import DDoSAPI, { DDoSDefenseSettings } from '@/lib/services/ddos-api'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'

export default function DDoSSettingsPage() {
  const [settings, setSettings] = useState<DDoSDefenseSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState('ddos-defense')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await DDoSAPI.getSettings()
      
      if (response.success && response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    
    try {
      setSaving(true)
      setSaveMessage(null)
      
      const response = await DDoSAPI.updateSettings(settings)
      
      if (response.success) {
        setSaveMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ type: 'error', text: 'Ayarlar kaydedilemedi' })
      }
    } catch (error) {
      console.error('Ayarlar kaydetme hatası:', error)
      setSaveMessage({ type: 'error', text: 'Ayarlar kaydedilemedi: ' + (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof DDoSDefenseSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center h-screen">
          <p className="text-slate-600 dark:text-slate-400">Ayarlar yüklenemedi</p>
        </div>
      </div>
    )
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
                DDoS Savunma Ayarları
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Otomatik savunma mekanizmalarını yapılandırın
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSettings}
                disabled={loading}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                saveMessage.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{saveMessage.text}</span>
            </motion.div>
          )}

          {/* Otomatik Savunma */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Otomatik Savunma</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Otomatik Savunma
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otomatik IP engelleme ve saldırı tespiti
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoDefenseEnabled}
                    onChange={(e) => updateSetting('autoDefenseEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Eşik Değerleri */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Eşik Değerleri</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  RPM Eşiği (İstek/Dakika)
                </label>
                <input
                  type="number"
                  value={settings.rpmThreshold}
                  onChange={(e) => updateSetting('rpmThreshold', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Dakikada bu değeri aşan istekler şüpheli kabul edilir
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  TPM Eşiği (Token/Dakika)
                </label>
                <input
                  type="number"
                  value={settings.tpmThreshold}
                  onChange={(e) => updateSetting('tpmThreshold', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Dakikada bu değeri aşan token kullanımı şüpheli kabul edilir
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Saldırı Sayısı Eşiği
                </label>
                <input
                  type="number"
                  value={settings.attackCountThreshold}
                  onChange={(e) => updateSetting('attackCountThreshold', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bu sayıda saldırı tespit edildiğinde IP otomatik engellenir
                </p>
              </div>
            </div>
          </div>

          {/* Engelleme Ayarları */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Engelleme Ayarları</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Engelleme Süresi (saniye)
                </label>
                <input
                  type="number"
                  value={settings.blockDuration}
                  onChange={(e) => updateSetting('blockDuration', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Geçici engellemeler için süre (saniye cinsinden)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Kalıcı Engelleme Eşiği
                </label>
                <input
                  type="number"
                  value={settings.permanentBlockAfter}
                  onChange={(e) => updateSetting('permanentBlockAfter', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bu sayıda engelleme sonrası IP kalıcı olarak engellenir
                </p>
              </div>
            </div>
          </div>

          {/* Uyarı Eşikleri */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Uyarı Eşikleri</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Yüksek Uyarı Eşiği
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.high}
                  onChange={(e) => updateSetting('alertThresholds', {
                    ...settings.alertThresholds,
                    high: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bu sayıda saldırı sonrası yüksek uyarı gönderilir
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Kritik Uyarı Eşiği
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.critical}
                  onChange={(e) => updateSetting('alertThresholds', {
                    ...settings.alertThresholds,
                    critical: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bu sayıda saldırı sonrası kritik uyarı gönderilir
                </p>
              </div>
            </div>
          </div>

          {/* Bildirim Ayarları */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Bildirim Ayarları</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Bildirimleri
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uyarılar için email gönder
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.email}
                    onChange={(e) => updateSetting('notificationSettings', {
                      ...settings.notificationSettings,
                      email: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Webhook Bildirimleri
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uyarılar için webhook gönder
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.webhook}
                    onChange={(e) => updateSetting('notificationSettings', {
                      ...settings.notificationSettings,
                      webhook: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

