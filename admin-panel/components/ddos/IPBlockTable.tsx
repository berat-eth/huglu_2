'use client'

import React, { useState } from 'react'
import { Shield, X, CheckCircle, Clock, AlertTriangle, Ban, Unlock } from 'lucide-react'
import { BlockedIP } from '@/lib/services/ddos-api'
import { useTheme } from '@/lib/ThemeContext'

interface IPBlockTableProps {
  blockedIPs: BlockedIP[]
  onUnblock?: (ip: string) => void
  onBlock?: (ip: string) => void
  loading?: boolean
}

export default function IPBlockTable({ blockedIPs, onUnblock, onBlock, loading }: IPBlockTableProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [selectedIPs, setSelectedIPs] = useState<Set<string>>(new Set())

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Süresiz'
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleSelect = (ip: string) => {
    const newSelected = new Set(selectedIPs)
    if (newSelected.has(ip)) {
      newSelected.delete(ip)
    } else {
      newSelected.add(ip)
    }
    setSelectedIPs(newSelected)
  }

  const selectAll = () => {
    if (selectedIPs.size === blockedIPs.length) {
      setSelectedIPs(new Set())
    } else {
      setSelectedIPs(new Set(blockedIPs.map(ip => ip.ip)))
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Engellenen IP'ler</h3>
            <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {blockedIPs.length}
            </span>
          </div>
          {selectedIPs.size > 0 && (
            <button
              onClick={() => {
                selectedIPs.forEach(ip => onUnblock?.(ip))
                setSelectedIPs(new Set())
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Seçilenleri Kaldır ({selectedIPs.size})
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIPs.size === blockedIPs.length && blockedIPs.length > 0}
                  onChange={selectAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                IP Adresi
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Sebep
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Saldırı Sayısı
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Engellenme Tarihi
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bitiş Tarihi
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {blockedIPs.map((blocked) => (
              <tr
                key={blocked.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  !blocked.isActive ? 'opacity-50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIPs.has(blocked.ip)}
                    onChange={() => toggleSelect(blocked.ip)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-slate-800 dark:text-slate-200">{blocked.ip}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{blocked.reason || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {blocked.isPermanent ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
                        <Ban className="w-3 h-3 inline mr-1" />
                        Kalıcı
                      </span>
                    ) : blocked.isExpired ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Süresi Doldu
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Geçici
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {blocked.totalAttacks || blocked.attackCount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(blocked.blockedAt)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(blocked.expiresAt)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {blocked.isActive && (
                    <button
                      onClick={() => onUnblock?.(blocked.ip)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      Kaldır
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {blockedIPs.length === 0 && (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Engellenen IP bulunamadı</p>
        </div>
      )}
    </div>
  )
}

