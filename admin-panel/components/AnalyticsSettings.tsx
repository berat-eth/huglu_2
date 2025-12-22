'use client'

import { Settings, Bell, Database, Download, Webhook } from 'lucide-react'
import { useState } from 'react'

export default function AnalyticsSettings() {
  const [settings, setSettings] = useState({
    eventTracking: true,
    dataRetention: 90,
    autoExport: false,
    webhookEnabled: false,
    webhookUrl: ''
  })

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-500" />
          Analitik Ayarları
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Analitik modülü yapılandırma ayarları</p>
      </div>

      {/* Event Tracking Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Event Tracking Ayarları</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Event Tracking Aktif</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tüm kullanıcı eventlerini kaydet</p>
            </div>
            <input
              type="checkbox"
              checked={settings.eventTracking}
              onChange={(e) => setSettings({ ...settings, eventTracking: e.target.checked })}
              className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Data Retention</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Veri Saklama Süresi (gün)
            </label>
            <input
              type="number"
              value={settings.dataRetention}
              onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="30"
              max="365"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {settings.dataRetention} günden eski veriler otomatik olarak silinecek
            </p>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Ayarları</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Otomatik Export</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Raporlar otomatik olarak export edilsin</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoExport}
              onChange={(e) => setSettings({ ...settings, autoExport: e.target.checked })}
              className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Webhook className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Webhook Entegrasyonları</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Webhook Aktif</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Event'ler webhook'a gönderilsin</p>
            </div>
            <input
              type="checkbox"
              checked={settings.webhookEnabled}
              onChange={(e) => setSettings({ ...settings, webhookEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
            />
          </label>
          {settings.webhookEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://example.com/webhook"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
          Ayarları Kaydet
        </button>
      </div>
    </div>
  )
}
