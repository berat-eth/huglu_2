'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Search, Filter, Download, Clock, CheckCircle, XCircle, Package, X, Truck, FileText, Printer, Send, MapPin, Phone, Mail, CreditCard, Calendar, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { orderService } from '@/lib/services'
import { formatDDMMYYYY } from '@/lib/date'
import { generateShippingLabelHTML } from '@/lib/printTemplates'
import type { Order } from '@/lib/api'
import { api, type ApiResponse } from '@/lib/api'

export default function Orders() {
  const copyToClipboard = async (text: string) => {
    if (typeof window === 'undefined') return
    
    try {
      await navigator.clipboard.writeText(text)
      alert('Kopyalandı')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        alert('Kopyalandı')
      } catch {
        alert('Kopyalanamadı')
      }
    }
  }
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const reloadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/orders')
      if ((res as any)?.success && (res as any).data) {
        setOrders((res as any).data)
      } else {
        throw new Error('Siparişler alınamadı')
      }
    } catch (e) {
      console.error('Orders fetch error:', e)
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [cargoCompany, setCargoCompany] = useState('')
  const [newStatus, setNewStatus] = useState<any>('processing')
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [generatingLabelId, setGeneratingLabelId] = useState<number | null>(null)
  const [autoInvoicingId, setAutoInvoicingId] = useState<number | null>(null)
  const [autoInvoiceSupported, setAutoInvoiceSupported] = useState<boolean>(true)
  // Kargo fişi için state'ler
  const [showCargoSlipModal, setShowCargoSlipModal] = useState(false)
  const [selectedOrderForCargoSlip, setSelectedOrderForCargoSlip] = useState<Order | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [invoiceLink, setInvoiceLink] = useState<string>('')
  const [generatingCargoSlipId, setGeneratingCargoSlipId] = useState<number | null>(null)
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([])
  const [customerInvoicesLoading, setCustomerInvoicesLoading] = useState(false)
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState<number | null>(null)

  useEffect(() => { reloadOrders() }, [])

  // Kargo fişi modal'ı açıldığında faturaları otomatik yükle
  useEffect(() => {
    if (showCargoSlipModal && selectedOrderForCargoSlip) {
      const loadInvoices = async () => {
        try {
          setInvoicesLoading(true)
          const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
          if (response.success && response.data) {
            setInvoices(response.data)
            // İlk faturayı varsayılan olarak seç
            if (response.data.length > 0 && !selectedInvoiceId) {
              setSelectedInvoiceId(response.data[0].id)
            }
          }
        } catch (err: any) {
          console.error('Faturalar yüklenemedi:', err)
        } finally {
          setInvoicesLoading(false)
        }
      }
      loadInvoices()
    }
  }, [showCargoSlipModal, selectedOrderForCargoSlip, selectedInvoiceId])

  // Fatura modal'ı açıldığında müşteriye ait faturaları yükle
  useEffect(() => {
    if (showInvoiceModal && selectedOrderForAction) {
      const loadCustomerInvoices = async () => {
        try {
          setCustomerInvoicesLoading(true)
          const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
          if (response.success && response.data) {
            // Müşteri bilgilerine göre filtrele
            const customerEmail = (selectedOrderForAction as any).customerEmail || (selectedOrderForAction as any).userEmail || ''
            const customerName = (selectedOrderForAction as any).customerName || (selectedOrderForAction as any).userName || ''
            const orderId = selectedOrderForAction.id
            
            const filteredInvoices = response.data.filter((inv: any) => {
              // Sipariş ID'sine göre eşleştir
              if (inv.orderId === orderId) return true
              
              // Müşteri email'ine göre eşleştir
              if (customerEmail && inv.customerEmail && 
                  inv.customerEmail.toLowerCase() === customerEmail.toLowerCase()) {
                return true
              }
              
              // Müşteri adına göre eşleştir
              if (customerName && inv.customerName && 
                  inv.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
                return true
              }
              
              return false
            })
            
            setCustomerInvoices(filteredInvoices)
            
            // İlk faturayı varsayılan olarak seç
            if (filteredInvoices.length > 0 && !selectedInvoiceId) {
              setSelectedInvoiceId(filteredInvoices[0].id)
            }
          }
        } catch (err: any) {
          console.error('Müşteri faturaları yüklenemedi:', err)
        } finally {
          setCustomerInvoicesLoading(false)
        }
      }
      loadCustomerInvoices()
    }
  }, [showInvoiceModal, selectedOrderForAction])

  const statusConfig: Record<any, { label: string; color: string; icon: any; dotColor: string }> = {
    pending: { label: 'Ödeme Bekleniyor', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, dotColor: 'bg-yellow-500' },
    processing: { label: 'Paketleniyor', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package, dotColor: 'bg-blue-500' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck, dotColor: 'bg-purple-500' },
    completed: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, dotColor: 'bg-green-500' },
    delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, dotColor: 'bg-green-500' },
    cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, dotColor: 'bg-red-500' },
  }

  const cargoStatusConfig: Record<Exclude<Order['cargoStatus'], undefined>, { label: string; color: string }> = {
    preparing: { label: 'Hazırlanıyor', color: 'bg-yellow-100 text-yellow-700' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-blue-100 text-blue-700' },
    'in-transit': { label: 'Yolda', color: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700' }
  }

  const handlePrintInvoice = (order: Order) => {
    alert(`📄 Fatura yazdırılıyor: ${order.invoiceNumber}`)
  }

  const handleSendInvoice = (order: Order) => {
    alert(`📧 Fatura e-posta ile gönderiliyor: ${order.customerEmail}`)
  }

  const handleTrackCargo = (order: Order) => {
    if (order.trackingNumber) {
      alert(`📦 Kargo takip: ${order.trackingNumber}\nKargo Firması: ${order.cargoCompany}`)
    }
  }

  const handleGenerateShippingLabel = async (order: Order) => {
    try {
      setGeneratingLabelId(order.id)
      const res = await api.post<any>(`/admin/orders/${(order as any).id}/shipping-label`)
      const data = (res as any)?.data
      if (data) {
        const html = generateShippingLabelHTML(data)
        const w = typeof window !== 'undefined' ? window.open('', '_blank') : null
        if (w) {
          w.document.open()
          w.document.write(html)
          w.document.close()
        } else {
          alert(`Kargo fişi oluşturuldu\nBarkod: ${data.barcode}\nAlıcı: ${data.shipTo?.name}`)
        }
      } else {
        alert('Kargo fişi oluşturulamadı')
      }
    } catch (e) {
      alert('Kargo fişi oluşturulurken hata oluştu')
    } finally {
      setGeneratingLabelId(null)
    }
  }

  const handleAutoInvoice = async (order: Order) => {
    try {
      setAutoInvoicingId(order.id)
      // Tek dene: olmayan uç için 404 aldığımızda özelliği kapat ve kullanıcıyı bilgilendir
      const r1 = await api.post<any>(`/admin/orders/${(order as any).id}/invoice/auto`).catch((err: any) => err)
      const success = (r1 as any)?.success === true
      if (success) {
        alert('Fatura otomatik oluşturuldu')
        await reloadOrders()
      } else {
        setAutoInvoiceSupported(false)
        alert('Otomatik fatura özelliği şu anda sunucuda desteklenmiyor (404).')
      }
    } catch (e) {
      setAutoInvoiceSupported(false)
      alert('Otomatik fatura özelliği şu anda sunucuda desteklenmiyor.')
    } finally {
      setAutoInvoicingId(null)
    }
  }

  // Faturaları yükle
  const handleShowInvoices = async () => {
    try {
      setInvoicesLoading(true)
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data) {
        setInvoices(response.data)
        // İlk faturayı varsayılan olarak seç
        if (response.data.length > 0 && !selectedInvoiceId) {
          setSelectedInvoiceId(response.data[0].id)
        }
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  // Kargo fişi oluştur
  const handleGenerateCargoSlip = async () => {
    if (!selectedOrderForCargoSlip) return
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api'
    
    try {
      setGeneratingCargoSlipId(selectedOrderForCargoSlip.id)
      
      // Fatura linki veya seçili fatura kontrolü
      let invoiceUrl = ''
      
      if (invoiceLink && invoiceLink.trim()) {
        invoiceUrl = invoiceLink.trim()
      } else if (selectedInvoiceId) {
        const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId)
        if (!selectedInvoice) {
          alert('Seçili fatura bulunamadı.')
          return
        }
        
        if (selectedInvoice.id) {
          invoiceUrl = `${API_BASE_URL}/admin/invoices/${selectedInvoice.id}/download`
        } else if (selectedInvoice.shareUrl) {
          invoiceUrl = `${selectedInvoice.shareUrl}/download`
        }
      } else {
        alert('Lütfen bir fatura seçin veya fatura linki girin.')
        return
      }

      // Kargo bilgilerini al
      const cargoTrackingNumber = (selectedOrderForCargoSlip as any).trackingNumber || ''
      const cargoProviderName = (selectedOrderForCargoSlip as any).cargoCompany || ''
      const barcode = (selectedOrderForCargoSlip as any).barcode || ''

      // Backend'e istek gönder
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const token = sessionStorage.getItem('authToken') || ''
      
      const response = await fetch(`${API_BASE_URL}/admin/generate-cargo-slip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({
          orderId: selectedOrderForCargoSlip.id,
          invoiceUrl: invoiceUrl,
          cargoTrackingNumber: cargoTrackingNumber,
          cargoProviderName: cargoProviderName,
          barcode: barcode,
          customerName: (selectedOrderForCargoSlip as any).userName || (selectedOrderForCargoSlip as any).customerName || '',
          customerEmail: (selectedOrderForCargoSlip as any).userEmail || (selectedOrderForCargoSlip as any).customerEmail || '',
          customerPhone: (selectedOrderForCargoSlip as any).customerPhone || '',
          customerAddress: selectedOrderForCargoSlip.shippingAddress || (selectedOrderForCargoSlip as any).fullAddress || '',
          city: (selectedOrderForCargoSlip as any).city || '',
          district: (selectedOrderForCargoSlip as any).district || '',
          items: (selectedOrderForCargoSlip.items || []).map(item => ({
            productName: item.productName || '',
            productSku: '',
            quantity: item.quantity || 1
          })),
          provider: null // Mobil uygulamadan gelen siparişler için provider null
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // Müşteri adını dosya adı için hazırla (özel karakterleri temizle)
        const customerName = (selectedOrderForCargoSlip as any).userName || (selectedOrderForCargoSlip as any).customerName || 'Musteri'
        const sanitizedCustomerName = customerName
          .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '') // Özel karakterleri temizle
          .replace(/\s+/g, '_') // Boşlukları alt çizgi ile değiştir
          .substring(0, 50) // Maksimum 50 karakter
        const fileName = `kargo-fisi-${sanitizedCustomerName}-${selectedOrderForCargoSlip.id}.pdf`
        
        // PDF'i yeni pencerede aç ve yazdır
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print()
            // Yazdırma işlemi tamamlandıktan sonra indirme seçeneği sun
            setTimeout(() => {
              if (confirm('Kargo fişi yazdırıldı. Dosyayı indirmek ister misiniz?')) {
                const a = document.createElement('a')
                a.href = url
                a.download = fileName
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }
              window.URL.revokeObjectURL(url)
            }, 1000)
          }
        } else {
          // Popup engellendi, direkt indir
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
        
        // Kargo fişi başarıyla oluşturuldu, siparişleri yeniden yükle
        await reloadOrders()
        setShowCargoSlipModal(false)
        setSelectedOrderForCargoSlip(null)
      } else {
        const errorText = await response.text()
        let errorMessage = 'Bilinmeyen hata'
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        alert('Kargo fişi oluşturulamadı: ' + errorMessage)
      }
    } catch (error: any) {
      console.error('Kargo fişi oluşturma hatası:', error)
      alert('Kargo fişi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setGeneratingCargoSlipId(null)
    }
  }

  const openOrderDetails = async (order: Order) => {
    try {
      setNewStatus((order as any).status || 'pending')
      setViewingOrder(order)
      setDetailLoading(true)
      
      // Detaylı sipariş bilgilerini çek
      const res = await api.get<any>(`/admin/orders/${(order as any).id}`)
      if ((res as any)?.success && (res as any).data) {
        setViewingOrder((res as any).data)
        setNewStatus(((res as any).data as any).status || 'pending')
      } else {
        // API'den detay alınamazsa mevcut veriyi kullan
        console.warn('Order details not found, using list data')
      }
    } catch (e) {
      console.error('Order details fetch error:', e)
      // Sessiz düş; mevcut listedeki veriyi göster
    } finally {
      setDetailLoading(false)
    }
  }

  const updateOrderStatus = async () => {
    if (!viewingOrder) return
    try {
      setUpdateLoading(true)
      const response = await api.patch(`/admin/orders/${(viewingOrder as any).id}/status`, { 
        status: newStatus 
      })
      
      if ((response as any)?.success) {
        // Başarılı güncelleme
        alert('✅ Sipariş durumu başarıyla güncellendi!')
        
        // Modal'ı kapat ve listeyi yenile
        setViewingOrder(null)
        await reloadOrders()
      } else {
        throw new Error((response as any)?.message || 'Güncelleme başarısız')
      }
    } catch (e) {
      console.error('Order status update error:', e)
      alert(`❌ Sipariş durumu güncellenemedi: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`)
    } finally {
      setUpdateLoading(false)
    }
  }

  const updateShipping = async () => {
    if (!selectedOrderForAction) return
    try {
      setUpdateLoading(true)
      await api.patch(`/admin/orders/${(selectedOrderForAction as any).id}/shipping`, {
        trackingNumber,
        cargoCompany,
        cargoStatus: 'shipped'
      })
      setSelectedOrderForAction(null)
      setShowCargoModal(false)
      await reloadOrders()
    } catch (e) {
      alert('Kargo bilgisi güncellenemedi')
    } finally {
      setUpdateLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = orders.length
    const waiting = orders.filter(o => o.status === 'pending').length
    const processing = orders.filter(o => o.status === 'processing').length
    const completed = orders.filter(o => o.status === 'completed').length
    return [
      { label: 'Toplam Sipariş', value: total.toLocaleString(), color: 'from-blue-500 to-blue-600' },
      { label: 'Bekleyen', value: waiting.toLocaleString(), color: 'from-yellow-500 to-yellow-600' },
      { label: 'İşlenen', value: processing.toLocaleString(), color: 'from-purple-500 to-purple-600' },
      { label: 'Tamamlanan', value: completed.toLocaleString(), color: 'from-green-500 to-green-600' },
    ]
  }, [orders])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Sipariş Yönetimi</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tüm siparişlerinizi takip edin</p>
        </div>
        <button
          onClick={() => {
            try {
              const csvRows: string[] = []
              csvRows.push('Sipariş No,Müşteri,Email,Tarih,Ödeme,Tutar,Durum')
              orders.forEach((o) => {
                const id = `#${o.id}`
                const name = (o as any).userName || (o as any).customer || ''
                const email = (o as any).userEmail || (o as any).customerEmail || ''
                const date = formatDDMMYYYY((o as any).createdAt || (o as any).date)
                const payment = (o as any).paymentMethod || (o as any).payment || ''
                const amount = (o.totalAmount ?? (o as any).total) as any
                const status = String((o as any).status || '')
                const row = [id, name, email, date, payment, String(amount), status]
                  .map(v => String(v).replaceAll('"', '""'))
                  .map(v => `"${v}"`).join(',')
                csvRows.push(row)
              })
              if (typeof window !== 'undefined') {
                const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `siparisler-${formatDDMMYYYY(new Date())}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }
            } catch {
              alert('Rapor indirilemedi')
            }
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
        >
          <Download className="w-5 h-5" />
          <span>Rapor İndir</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 card-hover"
          >
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
            <div className={`mt-3 h-2 bg-gradient-to-r ${stat.color} rounded-full`}></div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Sipariş veya müşteri ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-white dark:placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors dark:text-white">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
            <select className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white">
              <option>Tüm Durumlar</option>
              <option>Beklemede</option>
              <option>İşleniyor</option>
              <option>Tamamlandı</option>
              <option>İptal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Sipariş</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ürün</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ödeme</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((order, index) => {
                const StatusIcon = statusConfig[order.status as NonNullable<Order['status']>].icon
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => openOrderDetails(order)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {(order as any).userName?.charAt ? (order as any).userName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{(order as any).userName || '—'}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{(order as any).userEmail || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{order.createdAt}</td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{(order as any).itemCount ?? (order.items?.length || 0)} ürün</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                          {order.paymentMethod || (order as any).payment || 'Belirtilmemiş'}
                        </span>
                      </div>
                      {(order as any).deliveryMethod === 'pickup' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Package className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Mağazadan Teslim Al</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">₺{order.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${statusConfig[order.status as NonNullable<Order['status']>].color}`}>
                        <div className={`w-2 h-2 rounded-full ${statusConfig[order.status as NonNullable<Order['status']>].dotColor}`}></div>
                        <span className="text-xs font-medium">{statusConfig[order.status as NonNullable<Order['status']>].label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => { openOrderDetails(order) }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Detayları Gör"
                        >
                          <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderForCargoSlip(order)
                            setShowCargoSlipModal(true)
                          }}
                          disabled={generatingCargoSlipId === order.id}
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group disabled:opacity-50 relative"
                          title="Kargo Fişi Oluştur"
                        >
                          <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                          {(order as any).cargoSlipPrintedAt && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="Kargo fişi yazıldı"></span>
                          )}
                        </button>
                        {autoInvoiceSupported && (
                          <button
                            onClick={() => handleAutoInvoice(order)}
                            disabled={autoInvoicingId === order.id}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors group disabled:opacity-50"
                            title="Otomatik Fatura Kes"
                          >
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                          </button>
                        )}
                        {order.trackingNumber && (
                        <button
                          onClick={() => {
                            setSelectedOrderForAction(order)
                            setTrackingNumber((order as any).trackingNumber || '')
                            setCargoCompany((order as any).cargoCompany || '')
                            setShowCargoModal(true)
                          }}
                          className="p-2 hover:bg-purple-50 rounded-lg transition-colors group"
                          title="Kargo Takip / Güncelle"
                        >
                          <Truck className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
                        </button>
                        )}
                        {/* Fatura Seçme Dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (showInvoiceDropdown === order.id) {
                                setShowInvoiceDropdown(null)
                              } else {
                                setSelectedOrderForAction(order)
                                setShowInvoiceDropdown(order.id)
                                // Müşteriye ait faturaları yükle
                                const loadCustomerInvoices = async () => {
                                  try {
                                    setCustomerInvoicesLoading(true)
                                    const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
                                    if (response.success && response.data) {
                                      const customerEmail = (order as any).customerEmail || (order as any).userEmail || ''
                                      const customerName = (order as any).customerName || (order as any).userName || ''
                                      const orderId = order.id
                                      
                                      const filteredInvoices = response.data.filter((inv: any) => {
                                        if (inv.orderId === orderId) return true
                                        if (customerEmail && inv.customerEmail && 
                                            inv.customerEmail.toLowerCase() === customerEmail.toLowerCase()) return true
                                        if (customerName && inv.customerName && 
                                            inv.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) return true
                                        return false
                                      })
                                      
                                      setCustomerInvoices(filteredInvoices)
                                      if (filteredInvoices.length > 0 && !selectedInvoiceId) {
                                        setSelectedInvoiceId(filteredInvoices[0].id)
                                      }
                                    }
                                  } catch (err: any) {
                                    console.error('Faturalar yüklenemedi:', err)
                                  } finally {
                                    setCustomerInvoicesLoading(false)
                                  }
                                }
                                loadCustomerInvoices()
                              }
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                            title="Fatura Seç"
                          >
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                          </button>
                          {showInvoiceDropdown === order.id && customerInvoices.length > 0 && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 max-h-64 overflow-y-auto">
                              <div className="p-2">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 px-2">Müşteri Faturaları</p>
                                {customerInvoices.map((invoice: any) => (
                                  <button
                                    key={invoice.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedInvoiceId(invoice.id)
                                      setSelectedOrderForAction(order)
                                      setShowInvoiceDropdown(null)
                                      setShowInvoiceModal(true)
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                                      selectedInvoiceId === invoice.id
                                        ? 'bg-green-100 dark:bg-green-900/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                          #{invoice.invoiceNumber || invoice.id}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('tr-TR') : '—'}
                                        </p>
                                      </div>
                                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                        ₺{invoice.totalAmount?.toLocaleString('tr-TR') || '0'}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedOrderForAction(order)
                                    setShowInvoiceDropdown(null)
                                    setShowInvoiceModal(true)
                                  }}
                                  className="w-full mt-2 px-3 py-2 text-sm text-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Tümünü Gör
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Toplam 1,234 sipariş içinden 1-6 arası gösteriliyor</p>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm dark:text-slate-300">
              Önceki
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              1
            </button>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm dark:text-slate-300">
              2
            </button>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm dark:text-slate-300">
              3
            </button>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm dark:text-slate-300">
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Kargo Takip Modal */}
      <AnimatePresence>
        {showCargoModal && selectedOrderForAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCargoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Kargo Takip</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş #{selectedOrderForAction.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCargoModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Kargo Bilgileri */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kargo Firması</p>
                      <input value={cargoCompany} onChange={(e)=>setCargoCompany(e.target.value)} placeholder={selectedOrderForAction.cargoCompany || 'Kargo Firması'} className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-lg dark:bg-slate-800 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kargo Takip Kodu</p>
                      <input value={trackingNumber} onChange={(e)=>setTrackingNumber(e.target.value)} placeholder={selectedOrderForAction.trackingNumber || 'Kargo Takip Kodu'} className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-lg font-mono dark:bg-slate-800 dark:text-slate-300" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <button disabled={updateLoading} onClick={updateShipping} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Kargo Bilgisi Kaydet</button>
                  </div>
                </div>

                {/* Kargo Durumu */}
                {selectedOrderForAction.cargoStatus && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Kargo Durumu</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'preparing' ||
                            selectedOrderForAction.cargoStatus === 'shipped' ||
                            selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Kargo Hazırlanıyor</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Paketiniz kargoya hazırlanıyor</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'shipped' ||
                            selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Kargoya Verildi</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Paketiniz kargo şubesine teslim edildi</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Dağıtımda</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Paketiniz size ulaştırılıyor</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Teslim Edildi</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Paketiniz teslim edildi</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teslimat Adresi */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Teslimat Adresi</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {(selectedOrderForAction as any).deliveryMethod === 'pickup' 
                      ? `🏪 Mağazadan Teslim Al: ${(selectedOrderForAction as any).pickupStoreName || 'Mağaza'}`
                      : selectedOrderForAction.shippingAddress}
                  </p>
                  {(selectedOrderForAction as any).deliveryMethod === 'pickup' && (selectedOrderForAction as any).pickupStoreName && (
                    <div className="mt-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Mağaza: {(selectedOrderForAction as any).pickupStoreName}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      typeof window !== 'undefined' && window.open(`https://www.google.com/search?q=${selectedOrderForAction.trackingNumber}`, '_blank')
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                  >
                    Kargo Sitesinde Takip Et
                  </button>
                  <button
                    onClick={() => setShowCargoModal(false)}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fatura Modal */}
      <AnimatePresence>
        {showInvoiceModal && selectedOrderForAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvoiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Fatura Detayları</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş #{selectedOrderForAction.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Seçili Fatura Detayları */}
                {selectedInvoiceId && customerInvoices.length > 0 ? (
                  (() => {
                    const selectedInvoice = customerInvoices.find((inv: any) => inv.id === selectedInvoiceId)
                    if (!selectedInvoice) {
                      return (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                          <p className="text-center text-slate-500 dark:text-slate-400">Fatura bulunamadı.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fatura No</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                              {selectedInvoice.invoiceNumber || selectedInvoice.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fatura Tarihi</p>
                            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                              {selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString('tr-TR') : '—'}
                            </p>
                          </div>
                        </div>
                        {selectedInvoice.taxNumber && (
                          <div className="pt-4 border-t border-green-200 dark:border-green-800">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Vergi Numarası</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedInvoice.taxNumber}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : customerInvoicesLoading ? (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400">Faturalar yükleniyor...</div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <p className="text-center text-slate-500 dark:text-slate-400">Bu müşteri için fatura bulunamadı.</p>
                  </div>
                )}

                {/* Müşteri Bilgileri */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Müşteri Bilgileri</p>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">{selectedOrderForAction.customer}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedOrderForAction.customerEmail}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedOrderForAction.customerPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Ödeme Bilgileri</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-800">{selectedOrderForAction.paymentMethod || selectedOrderForAction.payment || 'Belirtilmemiş'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-800">{selectedOrderForAction.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fatura Adresi */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-slate-700">Fatura Adresi</p>
                  </div>
                  <p className="text-sm text-slate-600">{selectedOrderForAction.billingAddress}</p>
                </div>

                {/* Fatura Özeti */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Fatura Özeti</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Ürün Sayısı:</span>
                      <span className="font-semibold text-slate-800">{Array.isArray(selectedOrderForAction.items) ? selectedOrderForAction.items.length : (selectedOrderForAction.items as any)} ürün</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Ara Toplam:</span>
                      <span className="font-semibold text-slate-800">₺{(((selectedOrderForAction.total ?? selectedOrderForAction.totalAmount) * 0.82)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">KDV (%18):</span>
                      <span className="font-semibold text-slate-800">₺{(((selectedOrderForAction.total ?? selectedOrderForAction.totalAmount) * 0.18)).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Toplam:</span>
                      <span className="text-2xl font-bold text-green-600">₺{(selectedOrderForAction.total ?? selectedOrderForAction.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* İşlem Butonları */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handlePrintInvoice(selectedOrderForAction)}
                    className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                  >
                    <Printer className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-700">Yazdır</span>
                  </button>
                  <button
                    onClick={() => handleSendInvoice(selectedOrderForAction)}
                    className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                  >
                    <Send className="w-6 h-6 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-700">E-posta Gönder</span>
                  </button>
                  <button
                    onClick={() => {
                      alert('📥 Fatura PDF olarak indiriliyor...')
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                  >
                    <Download className="w-6 h-6 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-700">PDF İndir</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detay Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Sipariş Detayları</h3>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {detailLoading && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">Detaylar yükleniyor...</div>
                )}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş No</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">#{viewingOrder.id}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select value={newStatus} onChange={(e)=>setNewStatus(e.target.value)} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm flex-1 dark:bg-slate-800 dark:text-slate-300">
                      <option value="pending">Ödeme Bekleniyor</option>
                      <option value="processing">Paketleniyor</option>
                      <option value="shipped">Kargoya Verildi</option>
                      <option value="completed">Teslim Edildi</option>
                      <option value="cancelled">İptal</option>
                    </select>
                    <button 
                      disabled={updateLoading} 
                      onClick={updateOrderStatus} 
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
                    >
                      {updateLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Kaydediliyor...
                        </>
                      ) : (
                        'Durum Kaydet'
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {((viewingOrder as any).userName || (viewingOrder as any).customer || 'U').charAt(0)}
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{(viewingOrder as any).userName || (viewingOrder as any).customer || '—'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tarih</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{(() => {
                      const raw = (viewingOrder as any).createdAt || (viewingOrder as any).date
                      if (!raw) return '-'
                      const d = new Date(raw)
                      return isNaN(d.getTime()) ? String(raw) : `${formatDDMMYYYY(d)} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                    })()}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ödeme Yöntemi</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{(viewingOrder as any).paymentMethod || (viewingOrder as any).payment || '-'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ürün Sayısı</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{Array.isArray((viewingOrder as any).items) ? (viewingOrder as any).items.length : ((viewingOrder as any).items as any)} ürün</p>
                  </div>
                </div>

                {/* Ürünler */}
                {Array.isArray(viewingOrder.items) && viewingOrder.items.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ürünler</p>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            const lines = viewingOrder.items.map(it => `${it.productName} x${it.quantity} - ₺${(it.price * it.quantity).toLocaleString()}`)
                            copyToClipboard(lines.join('\n'))
                          }}
                          className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Ürünleri kopyala"
                          aria-label="Ürünleri kopyala"
                        >
                          <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{viewingOrder.items.length} kalem</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {viewingOrder.items.map((it, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {it.productImage ? (
                              <img src={it.productImage} alt={it.productName} className="w-12 h-12 rounded object-cover border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600" />
                            )}
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">{it.productName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Adet: {it.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">₺{(it.price * it.quantity).toLocaleString()}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Birim: ₺{it.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* İletişim Bilgileri */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">İletişim Bilgileri</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{(viewingOrder as any).userEmail || (viewingOrder as any).customerEmail || '-'}</span>
                      <button
                        onClick={() => copyToClipboard(String((viewingOrder as any).userEmail || (viewingOrder as any).customerEmail || ''))}
                        className="ml-auto p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="E-posta kopyala"
                        aria-label="E-posta kopyala"
                      >
                        <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{(viewingOrder as any).customerPhone || '-'}</span>
                      <button
                        onClick={() => copyToClipboard(String((viewingOrder as any).customerPhone || ''))}
                        className="ml-auto p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Telefon kopyala"
                        aria-label="Telefon kopyala"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Adres Bilgileri */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-slate-700">Teslimat Adresi</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <p className="flex-1 text-sm text-slate-600">
                        {(viewingOrder as any).deliveryMethod === 'pickup' 
                          ? `🏪 Mağazadan Teslim Al: ${(viewingOrder as any).pickupStoreName || 'Mağaza'}`
                          : viewingOrder.shippingAddress}
                      </p>
                      {(viewingOrder as any).deliveryMethod === 'pickup' && (viewingOrder as any).pickupStoreName && (
                        <div className="mt-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">Mağaza: {(viewingOrder as any).pickupStoreName}</span>
                        </div>
                      )}
                      <button
                        onClick={() => copyToClipboard(String(viewingOrder.shippingAddress || ''))}
                        className="p-1.5 border border-blue-300 rounded-lg hover:bg-blue-100"
                        title="Teslimat adresini kopyala"
                        aria-label="Teslimat adresini kopyala"
                      >
                        <Copy className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-semibold text-slate-700">Fatura Adresi</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <p className="flex-1 text-sm text-slate-600">{(viewingOrder as any).billingAddress || (viewingOrder as any).fullAddress || viewingOrder.shippingAddress || '-'}</p>
                      <button
                        onClick={() => copyToClipboard(String((viewingOrder as any).billingAddress || (viewingOrder as any).fullAddress || viewingOrder.shippingAddress || ''))}
                        className="p-1.5 border border-purple-300 rounded-lg hover:bg-purple-100"
                        title="Fatura adresini kopyala"
                        aria-label="Fatura adresini kopyala"
                      >
                        <Copy className="w-4 h-4 text-purple-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kargo Bilgileri */}
                {viewingOrder.trackingNumber && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-5 h-5 text-purple-600" />
                        <p className="text-sm font-semibold text-slate-700">Kargo Bilgileri</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(viewingOrder as any).cargoSlipPrintedAt && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Kargo Fişi Yazıldı
                          </span>
                        )}
                        {viewingOrder.cargoStatus && (
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${cargoStatusConfig[viewingOrder.cargoStatus].color}`}>
                            {cargoStatusConfig[viewingOrder.cargoStatus].label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Kargo Firması:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.cargoCompany}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Takip No:</span>
                        <span className="font-mono font-semibold text-purple-600">{viewingOrder.trackingNumber}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fatura Bilgileri */}
                {viewingOrder.invoiceNumber && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-semibold text-slate-700">Fatura Bilgileri</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Fatura No:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Fatura Tarihi:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.invoiceDate}</span>
                      </div>
                      {viewingOrder.taxNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Vergi No:</span>
                          <span className="font-semibold text-slate-800">{viewingOrder.taxNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <p className="text-sm text-slate-500 mb-3">Sipariş Özeti</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Ara Toplam</span>
                      <span className="font-semibold text-slate-800">₺{(() => {
                        const total = (viewingOrder as any).total ?? viewingOrder.totalAmount
                        const subtotal = typeof total === 'number' ? total * 0.82 : total
                        return Number(subtotal).toLocaleString()
                      })()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">KDV (%18)</span>
                      <span className="font-semibold text-slate-800">₺{(() => {
                        const total = (viewingOrder as any).total ?? viewingOrder.totalAmount
                        const vat = typeof total === 'number' ? total * 0.18 : 0
                        return Number(vat).toLocaleString()
                      })()}</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Toplam</span>
                      <span className="text-2xl font-bold text-green-600">₺{((viewingOrder as any).total ?? viewingOrder.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Hızlı İşlemler */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setSelectedOrderForCargoSlip(viewingOrder)
                      setShowCargoSlipModal(true)
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors relative"
                  >
                    <Printer className="w-6 h-6 text-emerald-600 mb-2" />
                    <span className="text-xs font-medium text-emerald-700">Kargo Fişi</span>
                    {(viewingOrder as any).cargoSlipPrintedAt && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" title="Kargo fişi yazıldı"></span>
                    )}
                  </button>
                  {viewingOrder.trackingNumber && (
                    <button
                      onClick={() => handleTrackCargo(viewingOrder)}
                      className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                    >
                      <Truck className="w-6 h-6 text-purple-600 mb-2" />
                      <span className="text-xs font-medium text-purple-700">Kargo Takip</span>
                    </button>
                  )}
                  {viewingOrder.invoiceNumber && (
                    <>
                      <button
                        onClick={() => handlePrintInvoice(viewingOrder)}
                        className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                      >
                        <Printer className="w-6 h-6 text-blue-600 mb-2" />
                        <span className="text-xs font-medium text-blue-700">Fatura Yazdır</span>
                      </button>
                      <button
                        onClick={() => handleSendInvoice(viewingOrder)}
                        className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                      >
                        <Send className="w-6 h-6 text-green-600 mb-2" />
                        <span className="text-xs font-medium text-green-700">Fatura Gönder</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setViewingOrder(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kargo Fişi Modal */}
      <AnimatePresence>
        {showCargoSlipModal && selectedOrderForCargoSlip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCargoSlipModal(false)
              setSelectedOrderForCargoSlip(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Printer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kargo Fişi Oluştur</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş #{selectedOrderForCargoSlip.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCargoSlipModal(false)
                    setSelectedOrderForCargoSlip(null)
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Fatura Seçimi */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Fatura Bilgileri</h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Fatura Linki */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Fatura Linki (Opsiyonel)
                      </label>
                      <input
                        type="text"
                        value={invoiceLink}
                        onChange={(e) => {
                          setInvoiceLink(e.target.value)
                          if (e.target.value.trim()) {
                            setSelectedInvoiceId(null)
                          }
                        }}
                        placeholder="https://api.plaxsy.com/api/invoices/share/..."
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {invoiceLink && invoiceLink.trim() && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Fatura linki girildi. Bu link QR kodda kullanılacak.
                        </p>
                      )}
                    </div>
                    
                    {/* Fatura Seçimi */}
                    {invoicesLoading ? (
                      <div className="text-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Faturalar yükleniyor...</p>
                      </div>
                    ) : invoices.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Kargo Fişi için Fatura Seçimi
                        </label>
                        <select
                          value={selectedInvoiceId || ''}
                          onChange={(e) => {
                            setSelectedInvoiceId(e.target.value ? Number(e.target.value) : null)
                            if (e.target.value) {
                              setInvoiceLink('')
                            }
                          }}
                          disabled={!!(invoiceLink && invoiceLink.trim())}
                          className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            invoiceLink && invoiceLink.trim() 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          <option value="">Fatura Seçiniz</option>
                          {invoices.map((invoice) => (
                            <option key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber || `Fatura #${invoice.id}`} 
                              {invoice.fileName && ` - ${invoice.fileName}`}
                              {invoice.totalAmount && ` (${Number(invoice.totalAmount).toFixed(2)} ${invoice.currency || 'TRY'})`}
                            </option>
                          ))}
                        </select>
                        {selectedInvoiceId && !invoiceLink && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Seçili fatura kargo fişindeki QR kodda kullanılacak
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        Fatura bulunamadı. Fatura linki girebilirsiniz.
                      </p>
                    )}
                  </div>
                </div>

                {/* Butonlar */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleGenerateCargoSlip}
                    disabled={generatingCargoSlipId === selectedOrderForCargoSlip.id || (!invoiceLink && !selectedInvoiceId)}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingCargoSlipId === selectedOrderForCargoSlip.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Oluşturuluyor...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-5 h-5" />
                        <span>Kargo Fişi Oluştur</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCargoSlipModal(false)
                      setSelectedOrderForCargoSlip(null)
                    }}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
