'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Calendar, Filter, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { analyticsService } from '@/lib/services/analyticsService'

export default function AnalyticsReports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const data = await analyticsService.getReports(50, 0)
      setReports(data.data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (reportId: number, format: 'pdf' | 'excel') => {
    try {
      const data = await analyticsService.exportReport(reportId, format)
      // Download link oluştur
      if (data.data?.filePath) {
        window.open(data.data.filePath, '_blank')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Rapor export edilemedi')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'generating':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            Raporlar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Oluşturulmuş analitik raporları görüntüleyin ve export edin</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Rapor
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reports.length > 0 ? (
          reports.map((report: any, index: number) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {report.reportName}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status === 'completed' ? 'Tamamlandı' :
                       report.status === 'generating' ? 'Oluşturuluyor' :
                       report.status === 'failed' ? 'Başarısız' : 'Beklemede'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(report.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {report.reportType}
                    </span>
                    {report.generatedAt && (
                      <span className="text-xs">
                        Oluşturulma: {new Date(report.generatedAt).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.status === 'completed' && (
                    <>
                      <button
                        onClick={() => handleExport(report.id, 'pdf')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleExport(report.id, 'excel')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Excel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Henüz rapor oluşturulmamış</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">Yeni bir rapor oluşturmak için yukarıdaki butonu kullanın</p>
          </div>
        )}
      </div>
    </div>
  )
}
