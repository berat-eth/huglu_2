'use client'

import { useState, useEffect } from 'react'
import { formatDDMMYYYY } from '@/lib/date'
import { Plus, Edit, Trash2, Search, Filter, TrendingUp, Package, Eye, RefreshCw, Power, Shield, UploadCloud, Activity, ToggleLeft, ToggleRight, CheckSquare, Square, Upload, FileText, X, Star, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { productService } from '@/lib/services'
import type { Product } from '@/lib/api'
import { AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<{ open: boolean; product?: Product | null }>({ open: false, product: null })
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ name:'', price:'', category:'', image:'', images:[] as string[], stock:0, brand:'', taxRate:0, priceIncludesTax:false, description:'' , hasVariations:false, isActive:true, excludeFromXml:false })
  const [formErrors, setFormErrors] = useState<Record<string,string>>({})
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ running: boolean; last?: string; message?: string } | null>(null)
  const [syncProgress, setSyncProgress] = useState<{ 
    current: number; 
    total: number; 
    percentage: number; 
    status: string; 
    currentItem?: string;
    errors?: number;
  } | null>(null)
  const [sizesMap, setSizesMap] = useState<Record<number, string[]>>({})
  const [sizesLoading, setSizesLoading] = useState<Record<number, boolean>>({})
  const [productSizes, setProductSizes] = useState<Record<number, Record<string, number>>>({})
  const [showViewModal, setShowViewModal] = useState<{ open: boolean; product?: Product | null; details?: any; variations?: any[]; sizeStocks?: Record<string, number> }>({ open: false, product: null, details: null, variations: [], sizeStocks: {} })
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [statusToggleLoading, setStatusToggleLoading] = useState<Record<number, boolean>>({})
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [transferringProducts, setTransferringProducts] = useState<Record<number, boolean>>({})
  const [transferMessages, setTransferMessages] = useState<Record<number, { type: 'success' | 'error'; message: string }>>({})
  const [settingMainImage, setSettingMainImage] = useState<Record<string, boolean>>({})

  const categories = ['Tümü', 'Kamp Malzemeleri', 'Outdoor Giyim', 'Ayakkabı', 'Aksesuar']

  // Fetch products from API
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const response = await productService.getProducts(page, 20)
      
      if (response.success && response.data) {
        setProducts(response.data.products)
        setTotalProducts(response.data.total)
        setHasMore(response.data.hasMore)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ürünler yüklenirken hata oluştu')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  // Search products
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      fetchProducts(1)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await productService.searchProducts(query, 1, 50)
      
      if (response.success && response.data) {
        setProducts(response.data)
        setTotalProducts(response.data.length)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(currentPage)
    loadTrendyolIntegration()
  }, [currentPage])


  // Trendyol entegrasyonunu yükle
  const loadTrendyolIntegration = async () => {
    try {
      const response = await api.get<any>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        setTrendyolIntegration(trendyol)
      }
    } catch (err: any) {
      console.error('Trendyol entegrasyonu yüklenemedi:', err)
    }
  }

  // Ürünü Trendyol'a aktar
  const transferToTrendyol = async (productId: number) => {
    if (!trendyolIntegration?.id) {
      setTransferMessages(prev => ({
        ...prev,
        [productId]: { type: 'error', message: 'Trendyol entegrasyonu bulunamadı' }
      }))
      setTimeout(() => {
        setTransferMessages(prev => {
          const newMessages = { ...prev }
          delete newMessages[productId]
          return newMessages
        })
      }, 5000)
      return
    }

    setTransferringProducts(prev => ({ ...prev, [productId]: true }))
    setTransferMessages(prev => {
      const newMessages = { ...prev }
      delete newMessages[productId]
      return newMessages
    })

    try {
      const response = await api.post<any>('/admin/trendyol/transfer-product', {
        integrationId: trendyolIntegration.id,
        productId: productId
      })

      if (response.success) {
        setTransferMessages(prev => ({
          ...prev,
          [productId]: { type: 'success', message: 'Trendyol\'a aktarıldı' }
        }))
      } else {
        setTransferMessages(prev => ({
          ...prev,
          [productId]: { type: 'error', message: response.message || 'Aktarım başarısız' }
        }))
      }
    } catch (err: any) {
      setTransferMessages(prev => ({
        ...prev,
        [productId]: { type: 'error', message: err.message || 'Aktarım hatası' }
      }))
    } finally {
      setTransferringProducts(prev => {
        const newProducts = { ...prev }
        delete newProducts[productId]
        return newProducts
      })
      // Mesajı 5 saniye sonra temizle
      setTimeout(() => {
        setTransferMessages(prev => {
          const newMessages = { ...prev }
          delete newMessages[productId]
          return newMessages
        })
      }, 5000)
    }
  }

  // Sync status fetcher
  const fetchSyncStatus = async () => {
    try {
      const res = await api.get<any>('/sync/status')
      if (res?.success && res?.data) {
        setSyncStatus({ running: !!res.data.isRunning, last: res.data.lastSyncTime })
      }
    } catch {}
  }

  // Sync progress fetcher
  const fetchSyncProgress = async () => {
    try {
      const res = await api.get<any>('/sync/progress')
      if (res?.success && res?.data) {
        setSyncProgress(res.data)
      }
    } catch (e) {
      console.error('Sync progress fetch failed:', e)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    fetchSyncProgress()
    const t = setInterval(() => {
      fetchSyncStatus()
      fetchSyncProgress()
    }, 3000) // Her 3 saniyede bir güncelle
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchProducts(searchTerm)
      } else {
        fetchProducts(1)
      }
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  // Fetch sizes (variations) and size stocks for current page of products
  useEffect(() => {
    const loadSizes = async () => {
      try {
        const base = products
          .filter(p => (selectedCategory === 'Tümü' || p.category === selectedCategory))
          .slice(0, 100)
        const missing = base.filter(p => sizesMap[p.id] === undefined || productSizes[p.id] === undefined).slice(0, 50)
        if (missing.length === 0) return
        const updates: Record<number, string[]> = {}
        const stockUpdates: Record<number, Record<string, number>> = {}
        
        await Promise.all(missing.map(async (p) => {
          try {
            setSizesLoading(prev => ({ ...prev, [p.id]: true }))
            
            // Hem variations hem de product details'i çek
            const [varsRes, productRes] = await Promise.all([
              productService.getProductVariations(p.id).catch(() => ({ success: false, data: { variations: [] } })),
              productService.getProductById(p.id).catch(() => ({ success: false, data: null }))
            ])
            
            const vars = (varsRes as any)?.data?.variations || []
            const sizeLike = (name: string = '') => {
              const n = (name || '').toLowerCase()
              return n.includes('beden') || n.includes('size') || n.includes('numara')
            }
            const values: string[] = []
            const seen = new Set<string>()
            
            // Variations'dan beden isimlerini çıkar
            vars.forEach((v: any) => {
              if (!v) return
              if (!v.name || !sizeLike(v.name)) return
              const opts: any[] = Array.isArray(v.options) ? v.options : []
              opts.forEach((o: any) => {
                const val = String(o?.value || '').trim()
                if (!val) return
                const k = val.toLowerCase()
                if (!seen.has(k)) { seen.add(k); values.push(val) }
              })
            })
            updates[p.id] = values
            
            // Product details'den beden stoklarını çıkar
            const sizes: Record<string, number> = {}
            if ((productRes as any)?.success && (productRes as any)?.data) {
              const productData = (productRes as any).data
              
              // variationDetails JSON'ını parse et
              if (productData.variationDetails) {
                try {
                  const variationDetails = typeof productData.variationDetails === 'string' 
                    ? JSON.parse(productData.variationDetails) 
                    : productData.variationDetails
                  
                  if (Array.isArray(variationDetails)) {
                    variationDetails.forEach((variation: any) => {
                      if (variation.attributes && variation.stok !== undefined) {
                        const attributes = variation.attributes
                        if (attributes && typeof attributes === 'object') {
                          const sizeKeys = Object.keys(attributes).filter(key => 
                            key.toLowerCase().includes('beden') || 
                            key.toLowerCase().includes('size')
                          )
                          
                          if (sizeKeys.length > 0) {
                            const size = attributes[sizeKeys[0]]
                            if (size && typeof size === 'string') {
                              const sizeName = size.trim()
                              if (sizeName) {
                                // Aynı beden için stokları topla
                                if (!sizes[sizeName]) {
                                  sizes[sizeName] = 0
                                }
                                sizes[sizeName] += parseInt(variation.stok) || 0
                              }
                            }
                          }
                        }
                      }
                    })
                  }
                } catch (parseError) {
                  console.error(`Ürün ${p.id} variationDetails parse hatası:`, parseError)
                }
              }
              
              // API'den gelen sizeStocks'u da kontrol et
              if ((varsRes as any)?.data?.sizeStocks) {
                Object.entries((varsRes as any).data.sizeStocks).forEach(([size, stock]: [string, any]) => {
                  if (size && stock !== undefined) {
                    const sizeName = String(size).trim()
                    if (sizeName) {
                      if (!sizes[sizeName]) {
                        sizes[sizeName] = 0
                      }
                      sizes[sizeName] += parseInt(String(stock)) || 0
                    }
                  }
                })
              }
            }
            
            if (Object.keys(sizes).length > 0) {
              stockUpdates[p.id] = sizes
            }
          } catch {
            updates[p.id] = []
          } finally {
            setSizesLoading(prev => ({ ...prev, [p.id]: false }))
          }
        }))
        
        if (Object.keys(updates).length > 0) {
          setSizesMap(prev => ({ ...prev, ...updates }))
        }
        if (Object.keys(stockUpdates).length > 0) {
          setProductSizes(prev => ({ ...prev, ...stockUpdates }))
        }
      } catch {}
    }
    loadSizes()
  }, [products, selectedCategory])

  // Ürünün toplam stokunu hesapla (beden bazlı veya base stock)
  const getTotalStock = (productId: number, baseStock: number = 0): number => {
    const sizeStocks = productSizes[productId] || {}
    const sizeStockValues = Object.values(sizeStocks)
    
    if (sizeStockValues.length > 0) {
      return sizeStockValues.reduce((sum, stock) => sum + (Number(stock) || 0), 0)
    }
    
    return baseStock
  }

  // Beden bazlı stok durumunu hesapla
  const getStockStatus = (productId: number, baseStock: number = 0): 'active' | 'low-stock' | 'out-of-stock' => {
    // Önce beden stoklarını kontrol et
    const sizeStocks = productSizes[productId] || {}
    const sizeStockValues = Object.values(sizeStocks)
    
    // Eğer beden stokları varsa, onları kullan
    if (sizeStockValues.length > 0) {
      const totalSizeStock = sizeStockValues.reduce((sum, stock) => sum + (Number(stock) || 0), 0)
      const hasAnyStock = sizeStockValues.some(stock => (Number(stock) || 0) > 0)
      
      // Tüm bedenler 0 ise stokta yok
      if (!hasAnyStock || totalSizeStock === 0) {
        return 'out-of-stock'
      }
      
      // Tüm bedenlerin toplamı 10 ve daha azsa düşük stok
      if (totalSizeStock <= 10) {
        return 'low-stock'
      }
      
      // En az bir bedende stok varsa aktif
      return 'active'
    }
    
    // Beden stokları yoksa, base stock'a bak
    if (baseStock > 10) return 'active'
    if (baseStock > 0) return 'low-stock'
    return 'out-of-stock'
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory
    // Beden bazlı stok kontrolü - en az bir bedende stok varsa veya base stock varsa göster
    const totalStock = getTotalStock(product.id, product.stock ?? 0)
    const hasStock = totalStock > 0
    return matchesCategory && hasStock
  })

  const openEdit = (p: Product) => {
    setShowEditModal({ open: true, product: p })
    setForm({
      name: p.name || '',
      price: p.price ?? '',
      category: (p as any).category || '',
      image: p.image || '',
      images: Array.isArray((p as any).images) ? (p as any).images : [],
      stock: p.stock ?? 0,
      brand: p.brand || '',
      taxRate: (p as any).taxRate ?? 0,
      priceIncludesTax: (p as any).priceIncludesTax ?? false,
      description: (p as any).description || '',
      hasVariations: (p as any).hasVariations ?? false,
      isActive: (p as any).isActive ?? true,
      excludeFromXml: (p as any).excludeFromXml ?? false
    })
    // Beden bilgilerini yükle
    loadProductSizeStocks(p.id)
  }

  const validateForm = (): boolean => {
    const errs: Record<string,string> = {}
    if (!String(form.name).trim()) errs.name = 'Ad zorunlu'
    const priceNum = Number(form.price)
    if (isNaN(priceNum) || priceNum < 0) errs.price = 'Geçerli bir fiyat girin'
    const stockNum = Number(form.stock)
    if (isNaN(stockNum) || stockNum < 0) errs.stock = 'Geçerli stok girin'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const buildUpdatePayload = () => {
    const payload: any = {}
    if (form.name !== undefined && form.name !== null && form.name !== '') payload.name = form.name
    if (form.description !== undefined && form.description !== null) payload.description = form.description
    if (form.price !== undefined && form.price !== null && form.price !== '') {
      const priceNum = Number(form.price)
      if (!isNaN(priceNum) && priceNum >= 0) {
        payload.price = priceNum
      }
    }
    if (form.taxRate !== undefined && form.taxRate !== null && form.taxRate !== '') {
      const taxNum = Number(form.taxRate)
      if (!isNaN(taxNum) && taxNum >= 0) {
        payload.taxRate = taxNum
      }
    }
    if (form.priceIncludesTax !== undefined) payload.priceIncludesTax = !!form.priceIncludesTax
    if (form.category !== undefined && form.category !== null && form.category !== '') payload.category = form.category
    if (form.image !== undefined && form.image !== null && form.image !== '') payload.image = form.image
    if (form.images !== undefined && form.images !== null) payload.images = form.images
    if (form.stock !== undefined && form.stock !== null && form.stock !== '') {
      const stockNum = Number(form.stock)
      if (!isNaN(stockNum) && stockNum >= 0) {
        payload.stock = stockNum
      }
    }
    if (form.brand !== undefined && form.brand !== null && form.brand !== '') payload.brand = form.brand
    if (form.hasVariations !== undefined) payload.hasVariations = !!form.hasVariations
    if (form.isActive !== undefined) payload.isActive = !!form.isActive
    if (form.excludeFromXml !== undefined) payload.excludeFromXml = !!form.excludeFromXml
    return payload
  }

  const loadProductSizeStocks = async (productId: number) => {
    try {
      const res = await productService.getProductById(productId)
      if ((res as any)?.success && (res as any)?.data) {
        const productData = (res as any).data
        const sizes: Record<string, number> = {}
        
        // variationDetails JSON'ını parse et
        if (productData.variationDetails) {
          try {
            const variationDetails = typeof productData.variationDetails === 'string' 
              ? JSON.parse(productData.variationDetails) 
              : productData.variationDetails
            
            if (Array.isArray(variationDetails)) {
              variationDetails.forEach((variation: any) => {
                if (variation.attributes && variation.stok !== undefined) {
                  // attributes objesinden beden bilgisini çıkar
                  const attributes = variation.attributes
                  if (attributes && typeof attributes === 'object') {
                    // Beden bilgisini bul (Beden, Size, etc.)
                    const sizeKeys = Object.keys(attributes).filter(key => 
                      key.toLowerCase().includes('beden') || 
                      key.toLowerCase().includes('size')
                    )
                    
                    if (sizeKeys.length > 0) {
                      const size = attributes[sizeKeys[0]]
                      if (size && typeof size === 'string') {
                        sizes[size] = parseInt(variation.stok) || 0
                      }
                    }
                  }
                } else if (variation.stok !== undefined) {
                  // Attributes yoksa ama stok varsa, varyasyon ID'sini beden olarak kullan
                  const bedenIsimleri = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
                  const index = variationDetails.indexOf(variation)
                  if (index < bedenIsimleri.length) {
                    const bedenAdi = bedenIsimleri[index]
                    sizes[bedenAdi] = parseInt(variation.stok) || 0
                  }
                }
              })
            }
          } catch (parseError) {
            console.error(`Ürün ${productId} variationDetails parse hatası:`, parseError)
          }
        }
        
        setProductSizes(prev => ({ ...prev, [productId]: sizes }))
      }
    } catch (error) {
      console.error(`Ürün ${productId} beden stokları alınamadı:`, error)
    }
  }

  // Ana görsel yap
  const setAsMainImage = async (productId: number, imageUrl: string) => {
    try {
      const imageKey = `${productId}-${imageUrl}`
      setSettingMainImage(prev => ({ ...prev, [imageKey]: true }))
      
      const response = await productService.updateProduct(productId, { image: imageUrl })
      
      if (response.success) {
        // Ürün listesini güncelle
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, image: imageUrl } : p
        ))
        
        // Modal'daki ürünü güncelle
        if (showViewModal.product && showViewModal.product.id === productId) {
          setShowViewModal(prev => ({
            ...prev,
            product: { ...prev.product!, image: imageUrl },
            details: prev.details ? { ...prev.details, image: imageUrl } : prev.details
          }))
        }
        
        alert('Ana görsel başarıyla güncellendi!')
      } else {
        alert('Ana görsel güncellenirken hata oluştu')
      }
    } catch (err: any) {
      console.error('Ana görsel güncelleme hatası:', err)
      alert('Ana görsel güncellenirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      const imageKey = `${productId}-${imageUrl}`
      setSettingMainImage(prev => ({ ...prev, [imageKey]: false }))
    }
  }

  // Toggle product status (active/inactive)
  const toggleProductStatus = async (productId: number, currentStatus: boolean) => {
    try {
      setStatusToggleLoading(prev => ({ ...prev, [productId]: true }))
      const newStatus = !currentStatus
      await productService.toggleProductStatus(productId, newStatus)
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, isActive: newStatus } : p
      ))
      
      // Show success message
      const statusText = newStatus ? 'aktif' : 'pasif'
      alert(`Ürün ${statusText} edildi`)
    } catch (error) {
      console.error('Status toggle error:', error)
      alert('Durum değiştirilemedi')
    } finally {
      setStatusToggleLoading(prev => ({ ...prev, [productId]: false }))
    }
  }

  // Bulk toggle status
  const bulkToggleStatus = async (isActive: boolean) => {
    if (selectedProducts.length === 0) {
      alert('Lütfen ürün seçin')
      return
    }

    try {
      setBulkActionLoading(true)
      await productService.bulkToggleStatus(selectedProducts, isActive)
      
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.includes(p.id) ? { ...p, isActive } : p
      ))
      
      const statusText = isActive ? 'aktif' : 'pasif'
      alert(`${selectedProducts.length} ürün ${statusText} edildi`)
      setSelectedProducts([])
    } catch (error) {
      console.error('Bulk status toggle error:', error)
      alert('Toplu durum değiştirilemedi')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Delete product
  const deleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`"${productName}" ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    try {
      await productService.deleteProduct(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
      alert('Ürün silindi')
    } catch (error) {
      console.error('Delete error:', error)
      alert('Ürün silinemedi')
    }
  }

  // Select/deselect product
  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  // Select all products
  const selectAllProducts = () => {
    setSelectedProducts(filteredProducts.map(p => p.id))
  }

  // Deselect all products
  const deselectAllProducts = () => {
    setSelectedProducts([])
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Hata</p>
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => fetchProducts(currentPage)}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Ürün Yönetimi</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Backend'den gelen ürünler</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-2 mr-4 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {selectedProducts.length} ürün seçildi
              </span>
              <button
                onClick={() => bulkToggleStatus(true)}
                disabled={bulkActionLoading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Aktif Et
              </button>
              <button
                onClick={() => bulkToggleStatus(false)}
                disabled={bulkActionLoading}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
              >
                Pasif Et
              </button>
              <button
                onClick={deselectAllProducts}
                className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-700"
              >
                Temizle
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl flex items-center hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ürün Ekle
          </button>
          <button
            onClick={async()=>{
              try {
                setSyncing(true)
                setSyncProgress(null) // Progress'i sıfırla
                await api.post('/sync/products')
                await fetchSyncStatus()
                await fetchSyncProgress()
                await fetchProducts(currentPage)
              } catch { alert('Senkron başlatılamadı') } finally { setSyncing(false) }
            }}
            disabled={syncing}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-xl flex items-center hover:shadow-lg transition-shadow disabled:opacity-60"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            {syncing ? 'Senkron Başlatılıyor...' : 'XML Senkronu Başlat'}
          </button>
          <button
            onClick={() => fetchProducts(currentPage)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl flex items-center hover:shadow-lg transition-shadow"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenile
          </button>
        </div>
      </div>

      {/* Sync status panel */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${syncStatus?.running ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <Activity className={`w-5 h-5 ${syncStatus?.running ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`} />
            </div>
            <div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold">XML Senkron Durumu</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{syncStatus?.running ? 'Çalışıyor' : 'Beklemede'}{syncStatus?.last ? ` • Son: ${formatDDMMYYYY(syncStatus.last)} ${new Date(syncStatus.last).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
            </div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Kaynak: Ticimax XML</div>
        </div>

        {/* Progress Bar */}
        {syncProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {syncProgress.current} / {syncProgress.total} ürün işlendi
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                %{Math.round(syncProgress.percentage)}
              </span>
            </div>
            
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${syncProgress.percentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{syncProgress.status}</span>
              {syncProgress.currentItem && (
                <span className="truncate max-w-xs">{syncProgress.currentItem}</span>
              )}
              {syncProgress.errors && syncProgress.errors > 0 && (
                <span className="text-red-500 dark:text-red-400">{syncProgress.errors} hata</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Toplam Ürün</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Aktif Ürün</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {products.filter(p => {
                  const status = getStockStatus(p.id, p.stock ?? 0)
                  return status === 'active'
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Düşük Stok</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {products.filter(p => {
                  const status = getStockStatus(p.id, p.stock ?? 0)
                  return status === 'low-stock'
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Stok Yok</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {products.filter(p => {
                  const status = getStockStatus(p.id, p.stock ?? 0)
                  return status === 'out-of-stock'
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.95,opacity:0}} className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-xl" onClick={(e)=>e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Yeni Ürün</h3>
                <button onClick={()=>setShowAddModal(false)} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">X</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Ad" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
                  <input placeholder="Fiyat" type="number" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} />
                  <input placeholder="Kategori" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} />
                  <input placeholder="Marka" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.brand} onChange={(e)=>setForm({...form,brand:e.target.value})} />
                  <input placeholder="Stok" type="number" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.stock} onChange={(e)=>setForm({...form,stock:Number(e.target.value)||0})} />
                  <input placeholder="Görsel URL" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.image} onChange={(e)=>setForm({...form,image:e.target.value})} />
                  <input placeholder="KDV Oranı (%)" type="number" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.taxRate} onChange={(e)=>setForm({...form,taxRate:Number(e.target.value)||0})} />
                  <div className="flex items-center gap-2">
                    <input id="incl" type="checkbox" checked={form.priceIncludesTax} onChange={(e)=>setForm({...form,priceIncludesTax:e.target.checked})} />
                    <label htmlFor="incl" className="text-sm text-slate-700 dark:text-slate-300">Fiyata KDV dahil</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="active" type="checkbox" checked={form.isActive} onChange={(e)=>setForm({...form,isActive:e.target.checked})} />
                    <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300">Aktif</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="xml" type="checkbox" checked={form.excludeFromXml} onChange={(e)=>setForm({...form,excludeFromXml:e.target.checked})} />
                    <label htmlFor="xml" className="text-sm text-slate-700 dark:text-slate-300">XML güncellemesinden muaf</label>
                  </div>
                </div>
                <textarea placeholder="Açıklama" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
                <div className="flex justify-end gap-2">
                  <button onClick={()=>setShowAddModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Vazgeç</button>
                  <button disabled={saving} onClick={async()=>{
                    try {
                      setSaving(true)
                      await api.post('/admin/products', {
                        name: form.name,
                        description: form.description,
                        price: Number(form.price),
                        category: form.category,
                        image: form.image,
                        stock: Number(form.stock)||0,
                        brand: form.brand,
                        taxRate: Number(form.taxRate)||0,
                        priceIncludesTax: !!form.priceIncludesTax
                      })
                      setShowAddModal(false)
                      setForm({ name:'', price:'', category:'', image:'', stock:0, brand:'', taxRate:0, priceIncludesTax:false, description:'', isActive:true, excludeFromXml:false })
                      await fetchProducts(currentPage)
                    } catch { alert('Ürün eklenemedi') } finally { setSaving(false) }
                  }} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Kaydet</button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Not: Pasife alma ve XML muafiyet bayrakları için backend alanları gereklidir. Şu an yalnızca UI hazırlanmıştır.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal.open && showEditModal.product && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditModal({ open: false, product: null })}>
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.95,opacity:0}} className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-3xl" onClick={(e)=>e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ürün Güncelle</h3>
                <button onClick={()=>setShowEditModal({ open:false, product:null })} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">X</button>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ad</label>
                    <input placeholder="Ürün adı" className={`px-3 py-2 border rounded w-full dark:bg-slate-800 dark:text-slate-300 ${formErrors.name?'border-red-300 dark:border-red-600': 'border-slate-300 dark:border-slate-700'}`} value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
                    {formErrors.name && <span className="text-xs text-red-600 dark:text-red-400">{formErrors.name}</span>}

                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Açıklama</label>
                    <textarea placeholder="Kısa açıklama" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded min-h-[90px] dark:bg-slate-800 dark:text-slate-300" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fiyat</label>
                        <input placeholder="0" type="number" className={`px-3 py-2 border rounded w-full dark:bg-slate-800 dark:text-slate-300 ${formErrors.price?'border-red-300 dark:border-red-600': 'border-slate-300 dark:border-slate-700'}`} value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} />
                        {formErrors.price && <span className="text-xs text-red-600 dark:text-red-400">{formErrors.price}</span>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">KDV (%)</label>
                        <input placeholder="0" type="number" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded w-full dark:bg-slate-800 dark:text-slate-300" value={form.taxRate} onChange={(e)=>setForm({...form,taxRate:Number(e.target.value)||0})} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input id="incl-edit" type="checkbox" checked={form.priceIncludesTax} onChange={(e)=>setForm({...form,priceIncludesTax:e.target.checked})} />
                      <label htmlFor="incl-edit" className="text-sm text-slate-700 dark:text-slate-300">Fiyata KDV dahil</label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                        <input placeholder="Kategori" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded w-full dark:bg-slate-800 dark:text-slate-300" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Marka</label>
                        <input placeholder="Marka" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded w-full dark:bg-slate-800 dark:text-slate-300" value={form.brand} onChange={(e)=>setForm({...form,brand:e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stok</label>
                      <input placeholder="0" type="number" className={`px-3 py-2 border rounded w-full dark:bg-slate-800 dark:text-slate-300 ${formErrors.stock?'border-red-300 dark:border-red-600': 'border-slate-300 dark:border-slate-700'}`} value={form.stock} onChange={(e)=>setForm({...form,stock:Number(e.target.value)||0})} />
                      {formErrors.stock && <span className="text-xs text-red-600 dark:text-red-400">{formErrors.stock}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <input id="hasVar" type="checkbox" checked={form.hasVariations} onChange={(e)=>setForm({...form,hasVariations:e.target.checked})} />
                      <label htmlFor="hasVar" className="text-sm text-slate-700 dark:text-slate-300">Varyasyonlu ürün</label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kapak Görseli</label>
                    <input placeholder="Görsel URL" className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded w-full dark:bg-slate-800 dark:text-slate-300" value={form.image} onChange={(e)=>setForm({...form,image:e.target.value})} />
                    {form.image && (
                      <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800">
                        <img src={form.image} alt="preview" className="w-full h-40 object-cover rounded" />
                      </div>
                    )}

                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ek Görseller</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input placeholder="Görsel URL ekle" className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-800 dark:text-slate-300" value={form._newImage || ''} onChange={(e)=>setForm({...form,_newImage:e.target.value})} />
                        <button onClick={()=>{ if (form._newImage && String(form._newImage).trim()) { setForm({...form, images:[...form.images, String(form._newImage).trim()], _newImage:''}) } }} className="px-3 py-2 bg-slate-800 text-white rounded">Ekle</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(form.images||[]).map((url:string,idx:number)=>(
                          <div key={idx} className="relative border border-slate-300 dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-800">
                            <img src={url} className="w-full h-24 object-cover" />
                            <button onClick={()=>setForm({...form, images: form.images.filter((_:any,i:number)=>i!==idx)})} className="absolute top-1 right-1 bg-white/90 dark:bg-slate-700/90 rounded px-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600">Sil</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Ürün Durumu</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ürün Durumu</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Ürünün aktif/pasif durumu</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${form.isActive ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              {form.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm({...form, isActive: !form.isActive})}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                form.isActive ? 'bg-green-600' : 'bg-orange-400'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">XML Senkron Muafiyeti</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">XML güncellemelerinden muaf tut</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${form.excludeFromXml ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {form.excludeFromXml ? 'Muaf' : 'Senkron'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm({...form, excludeFromXml: !form.excludeFromXml})}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                form.excludeFromXml ? 'bg-red-600' : 'bg-green-400'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  form.excludeFromXml ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                        Not: Bu ayarlar backend'de kalıcı olarak saklanır ve ürünün görünürlüğünü etkiler.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Beden Bilgileri */}
                {showEditModal.product && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Beden Stokları</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(productSizes[showEditModal.product.id] || {}).map(([size, stock]) => (
                        <div key={size} className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                          <div className="text-center">
                            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{size}</div>
                            <div className={`text-lg font-bold ${stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {stock} adet
                            </div>
                          </div>
                        </div>
                      ))}
                      {Object.keys(productSizes[showEditModal.product.id] || {}).length === 0 && (
                        <div className="col-span-4 text-center text-slate-500 dark:text-slate-400 py-4">
                          Beden bilgisi bulunamadı
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={()=>setShowEditModal({ open:false, product:null })} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Vazgeç</button>
                  <button disabled={saving} onClick={async()=>{
                    try {
                      if (!validateForm()) return
                      setSaving(true)
                      const payload = buildUpdatePayload()
                      await api.put(`/admin/products/${(showEditModal.product as any).id}` , payload)
                      setShowEditModal({ open:false, product:null })
                      await fetchProducts(currentPage)
                    } catch { alert('Ürün güncellenemedi') } finally { setSaving(false) }
                  }} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Güncelle</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-slate-300 dark:placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
            >
              {categories.map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={() => {
                        if (selectedProducts.length === filteredProducts.length) {
                          deselectAllProducts()
                        } else {
                          selectAllProducts()
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                    />
                    <span>Seç</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kategori</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fiyat</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Stok</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Bedenler</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Marka</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-dark-card">
              {filteredProducts.map((product, index) => {
                const status = getStockStatus(product.id, product.stock ?? 0)
                const totalStock = getTotalStock(product.id, product.stock ?? 0)
                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p 
                            className="font-semibold text-slate-800 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={async () => {
                              try {
                                const [detailsRes, varsRes] = await Promise.all([
                                  productService.getProductById(product.id),
                                  productService.getProductVariations(product.id)
                                ])
                                
                                // Beden stoklarını yükle
                                const sizeStocks: Record<string, number> = {}
                                if ((varsRes as any)?.data?.sizeStocks) {
                                  Object.entries((varsRes as any).data.sizeStocks).forEach(([size, stock]: [string, any]) => {
                                    if (size && stock !== undefined) {
                                      sizeStocks[size] = parseInt(String(stock)) || 0
                                    }
                                  })
                                }
                                
                                // Eğer productSizes'da yoksa ekle
                                if (Object.keys(sizeStocks).length > 0 && !productSizes[product.id]) {
                                  setProductSizes(prev => ({ ...prev, [product.id]: sizeStocks }))
                                }
                                
                                // Bedenleri yükle
                                const variations = (varsRes as any)?.data?.variations || []
                                const bedenler: string[] = []
                                variations.forEach((v: any) => {
                                  if (v?.name?.toLowerCase().includes('beden') && Array.isArray(v.options)) {
                                    v.options.forEach((o: any) => {
                                      const val = String(o?.value || '').trim()
                                      if (val && !bedenler.includes(val)) {
                                        bedenler.push(val)
                                      }
                                    })
                                  }
                                })
                                
                                // Eğer sizesMap'te yoksa ekle
                                if (bedenler.length > 0 && !sizesMap[product.id]) {
                                  setSizesMap(prev => ({ ...prev, [product.id]: bedenler }))
                                }
                                
                                setShowViewModal({ open: true, product, details: detailsRes?.data || product, variations: variations, sizeStocks: sizeStocks })
                              } catch {
                                setShowViewModal({ open: true, product, details: product, variations: sizesMap[product.id] || [], sizeStocks: productSizes[product.id] || {} })
                              }
                            }}
                          >
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 dark:text-slate-100">₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          status === 'active' ? 'text-green-600 dark:text-green-400' :
                          status === 'low-stock' ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {totalStock}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">adet</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sizesLoading[product.id] && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Yükleniyor...</span>
                      )}
                      {!sizesLoading[product.id] && (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(sizesMap[product.id] || []).slice(0, 6).map((s, i) => (
                            <span key={`${product.id}-size-${i}`} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs border border-slate-200 dark:border-slate-600">
                              {s}
                            </span>
                          ))}
                          {Array.isArray(sizesMap[product.id]) && sizesMap[product.id].length > 6 && (
                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs border border-slate-200 dark:border-slate-600">+{sizesMap[product.id].length - 6}</span>
                          )}
                          {Array.isArray(sizesMap[product.id]) && sizesMap[product.id].length === 0 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{product.brand}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                          status === 'low-stock' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        }`}>
                          {status === 'active' ? 'Aktif' :
                           status === 'low-stock' ? 'Düşük Stok' : 'Stok Yok'}
                        </span>
                        <button
                          onClick={() => toggleProductStatus(product.id, (product as any).isActive ?? true)}
                          disabled={statusToggleLoading[product.id]}
                          className={`p-1 rounded transition-colors ${
                            (product as any).isActive 
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' 
                              : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                          }`}
                          title={(product as any).isActive ? 'Pasif et' : 'Aktif et'}
                        >
                          {statusToggleLoading[product.id] ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (product as any).isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{product.sku || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={async () => {
                          try {
                            const [detailsRes, varsRes] = await Promise.all([
                              productService.getProductById(product.id),
                              productService.getProductVariations(product.id)
                            ])
                            
                            // Beden stoklarını yükle
                            const sizeStocks: Record<string, number> = {}
                            if ((varsRes as any)?.data?.sizeStocks) {
                              Object.entries((varsRes as any).data.sizeStocks).forEach(([size, stock]: [string, any]) => {
                                if (size && stock !== undefined) {
                                  sizeStocks[size] = parseInt(String(stock)) || 0
                                }
                              })
                            }
                            
                            // Eğer productSizes'da yoksa ekle
                            if (Object.keys(sizeStocks).length > 0 && !productSizes[product.id]) {
                              setProductSizes(prev => ({ ...prev, [product.id]: sizeStocks }))
                            }
                            
                            // Bedenleri yükle
                            const variations = (varsRes as any)?.data?.variations || []
                            const bedenler: string[] = []
                            variations.forEach((v: any) => {
                              if (v?.name?.toLowerCase().includes('beden') && Array.isArray(v.options)) {
                                v.options.forEach((o: any) => {
                                  const val = String(o?.value || '').trim()
                                  if (val && !bedenler.includes(val)) {
                                    bedenler.push(val)
                                  }
                                })
                              }
                            })
                            
                            // Eğer sizesMap'te yoksa ekle
                            if (bedenler.length > 0 && !sizesMap[product.id]) {
                              setSizesMap(prev => ({ ...prev, [product.id]: bedenler }))
                            }
                            
                            setShowViewModal({ open: true, product, details: detailsRes?.data || product, variations: variations, sizeStocks: sizeStocks })
                          } catch {
                            setShowViewModal({ open: true, product, details: product, variations: sizesMap[product.id] || [], sizeStocks: productSizes[product.id] || {} })
                          }
                        }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg" title="Görüntüle">
                          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button onClick={() => openEdit(product)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Güncelle">
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button 
                          onClick={() => transferToTrendyol(product.id)}
                          disabled={transferringProducts[product.id] || !trendyolIntegration}
                          className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed relative" 
                          title={trendyolIntegration ? "Trendyol'a Aktar" : "Trendyol entegrasyonu gerekli"}
                        >
                          {transferringProducts[product.id] ? (
                            <RefreshCw className="w-4 h-4 text-orange-600 dark:text-orange-400 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          )}
                          {transferMessages[product.id] && (
                            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap z-10 ${
                              transferMessages[product.id].type === 'success' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                            }`}>
                              {transferMessages[product.id].message}
                            </div>
                          )}
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.id, product.name)} 
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" 
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Toplam {totalProducts} ürün içinden {filteredProducts.length} gösteriliyor
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-300"
            >
              Önceki
            </button>
            <span className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg text-sm">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-300"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
      {/* View modal - full product data */}
      <AnimatePresence>
        {showViewModal.open && showViewModal.product && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowViewModal({ open: false, product: null, details: null, variations: [], sizeStocks: {} })}>
            <motion.div 
              initial={{scale:.95,opacity:0}} 
              animate={{scale:1,opacity:1}} 
              exit={{scale:.95,opacity:0}} 
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e)=>e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center overflow-hidden">
                    {showViewModal.product.image ? (
                      <img src={showViewModal.product.image} alt={showViewModal.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-7 h-7 text-white" />
                    )}
              </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{showViewModal.product.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ID: #{showViewModal.product.id}</p>
                  </div>
                </div>
                <button 
                  onClick={()=>setShowViewModal({ open:false, product:null, details:null, variations:[], sizeStocks: {} })} 
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Temel Bilgiler */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center">
                      <Package className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Temel Bilgiler
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Ürün Adı:</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{showViewModal.product.name}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Marka:</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{showViewModal.product.brand || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Kategori:</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                            {showViewModal.product.category || '-'}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Fiyat:</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ₺{showViewModal.product.price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Stok:</span>
                        <span className={`text-sm font-semibold ${
                          (showViewModal.product.stock ?? 0) > 10 ? 'text-green-600 dark:text-green-400' :
                          (showViewModal.product.stock ?? 0) > 0 ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {showViewModal.product.stock ?? 0} adet
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-slate-500 dark:text-slate-400">SKU:</span>
                        <span className="text-sm font-mono text-slate-800 dark:text-slate-200">{showViewModal.product.sku || '-'}</span>
                      </div>
                      {(showViewModal.product as any).taxRate !== undefined && (
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-slate-500 dark:text-slate-400">KDV Oranı:</span>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">%{(showViewModal.product as any).taxRate || 0}</span>
                        </div>
                      )}
                      {(showViewModal.product as any).isActive !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Durum:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            (showViewModal.product as any).isActive 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {(showViewModal.product as any).isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bedenler ve Varyasyonlar */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      Bedenler & Stok Durumu
                    </h4>
                    {showViewModal.product && (sizesMap[showViewModal.product.id] || []).length > 0 ? (
                      <div className="space-y-2">
                        {(sizesMap[showViewModal.product.id] || []).map((size, i) => {
                          // Önce productSizes'tan kontrol et, sonra showViewModal.sizeStocks'tan, sonra details'ten
                          const productId = showViewModal.product!.id
                          let stock = productSizes[productId]?.[size] ?? 0
                          
                          // Eğer productSizes'ta yoksa, modal state'inden kontrol et
                          if (stock === 0 && showViewModal.sizeStocks && showViewModal.sizeStocks[size]) {
                            stock = parseInt(String(showViewModal.sizeStocks[size])) || 0
                          }
                          
                          // Hala 0 ise, details'ten kontrol et
                          if (stock === 0 && showViewModal.details) {
                            // sizeStocks varsa kullan
                            if ((showViewModal.details as any).sizeStocks && (showViewModal.details as any).sizeStocks[size]) {
                              stock = parseInt(String((showViewModal.details as any).sizeStocks[size])) || 0
                            }
                            // variationDetails'ten de kontrol et
                            else if ((showViewModal.details as any).variationDetails) {
                              try {
                                const variationDetails = typeof (showViewModal.details as any).variationDetails === 'string' 
                                  ? JSON.parse((showViewModal.details as any).variationDetails) 
                                  : (showViewModal.details as any).variationDetails
                                
                                if (Array.isArray(variationDetails)) {
                                  variationDetails.forEach((variation: any) => {
                                    if (variation.attributes && variation.stok !== undefined) {
                                      const attributes = variation.attributes
                                      if (attributes && typeof attributes === 'object') {
                                        const sizeKeys = Object.keys(attributes).filter(key => 
                                          key.toLowerCase().includes('beden') || 
                                          key.toLowerCase().includes('size')
                                        )
                                        
                                        if (sizeKeys.length > 0) {
                                          const sizeValue = String(attributes[sizeKeys[0]] || '').trim()
                                          if (sizeValue === size) {
                                            stock += parseInt(String(variation.stok)) || 0
                                          }
                                        }
                                      }
                                    }
                                  })
                                }
                              } catch (e) {
                                // Parse hatası, devam et
                              }
                            }
                          }
                          const stockColor = stock > 10 ? 'text-green-600 dark:text-green-400' :
                                           stock > 0 ? 'text-orange-600 dark:text-orange-400' :
                                           'text-red-600 dark:text-red-400'
                          const bgColor = stock > 10 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                         stock > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                         'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          
                          return (
                            <div 
                              key={`view-size-${i}`} 
                              className={`px-4 py-3 bg-white dark:bg-slate-700 rounded-lg border ${bgColor} shadow-sm flex items-center justify-between`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {size}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${stockColor}`}>
                                  {stock} adet
                                </span>
                                {stock === 0 && (
                                  <span className="text-xs text-red-500 dark:text-red-400">Stokta Yok</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {/* Toplam Stok */}
                        {showViewModal.product && (() => {
                          // Tüm bedenlerin stoklarını topla
                          let totalStock = 0
                          const productId = showViewModal.product.id
                          const currentSizes = sizesMap[productId] || []
                          currentSizes.forEach((size) => {
                            let stock = productSizes[productId]?.[size] ?? 0
                            
                            // Eğer productSizes'ta yoksa, modal state'inden kontrol et
                            if (stock === 0 && showViewModal.sizeStocks && showViewModal.sizeStocks[size]) {
                              stock = parseInt(String(showViewModal.sizeStocks[size])) || 0
                            }
                            
                            // Hala 0 ise, details'ten kontrol et
                            if (stock === 0 && showViewModal.details) {
                              if ((showViewModal.details as any).sizeStocks && (showViewModal.details as any).sizeStocks[size]) {
                                stock = parseInt(String((showViewModal.details as any).sizeStocks[size])) || 0
                              }
                            }
                            
                            totalStock += stock
                          })
                          
                          return totalStock > 0 ? (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between px-2">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Toplam Stok:</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {totalStock} adet
                                </span>
                              </div>
                            </div>
                          ) : null
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 dark:text-slate-500">Beden bilgisi bulunmuyor</p>
                        {showViewModal.product.stock !== undefined && showViewModal.product.stock > 0 && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            Genel Stok: {showViewModal.product.stock} adet
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Varyasyonlar varsa göster */}
                    {showViewModal.variations && showViewModal.variations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold">Varyasyonlar:</p>
                        <div className="space-y-2">
                          {showViewModal.variations.slice(0, 5).map((variation: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                              {variation.name || variation.size || `Varyasyon ${idx + 1}`}
                            </div>
                          ))}
                          {showViewModal.variations.length > 5 && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">+{showViewModal.variations.length - 5} varyasyon daha</p>
                    )}
                  </div>
                </div>
                    )}
                </div>

                  {/* Açıklama */}
                  {showViewModal.product.description && (
                    <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                        Açıklama
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {showViewModal.product.description}
                      </p>
                    </div>
                  )}

                  {/* Görseller */}
                  {(() => {
                    // Tüm görselleri topla
                    const allImages: string[] = []
                    const seen = new Set<string>()
                    
                    const addImage = (url: string | null | undefined) => {
                      if (url && typeof url === 'string' && url.trim() !== '' && !seen.has(url.trim())) {
                        seen.add(url.trim())
                        allImages.push(url.trim())
                      }
                    }
                    
                    const product = showViewModal.product
                    const details = showViewModal.details || product
                    
                    // Ana görsel
                    addImage(product?.image)
                    addImage(details?.image)
                    
                    // images array
                    if (details?.images) {
                      try {
                        let imagesArray = details.images
                        if (typeof imagesArray === 'string') {
                          imagesArray = JSON.parse(imagesArray)
                        }
                        if (Array.isArray(imagesArray)) {
                          imagesArray.forEach((img: any) => {
                            const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src)
                            addImage(url)
                          })
                        }
                      } catch (e) {
                        // Parse hatası, devam et
                      }
                    }
                    
                    // image1-5
                    addImage(details?.image1)
                    addImage(details?.image2)
                    addImage(details?.image3)
                    addImage(details?.image4)
                    addImage(details?.image5)
                    
                    // gallery
                    if (details?.gallery) {
                      try {
                        let galleryArray = details.gallery
                        if (typeof galleryArray === 'string') {
                          galleryArray = JSON.parse(galleryArray)
                        }
                        if (Array.isArray(galleryArray)) {
                          galleryArray.forEach((img: any) => {
                            const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src)
                            addImage(url)
                          })
                        } else if (typeof galleryArray === 'string') {
                          addImage(galleryArray)
                        }
                      } catch (e) {
                        // Parse hatası, devam et
                      }
                    }
                    
                    // thumbnail
                    addImage(details?.thumbnail)
                    
                    return allImages.length > 0 ? (
                      <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center">
                          <Eye className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
                          Görseller ({allImages.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {allImages.map((img, idx) => {
                            const isMainImage = product?.image === img || (details && (details as any).image === img)
                            const imageKey = `${product?.id || 'unknown'}-${img}`
                            const isLoading = settingMainImage[imageKey]
                            
                            return (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-600 group hover:shadow-lg transition-shadow">
                                {/* Ana görsel badge */}
                                {isMainImage && (
                                  <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" />
                                    Ana Görsel
                                  </div>
                                )}
                                
                                <img 
                                  src={img} 
                                  alt={`${product?.name || 'Ürün'} - ${idx + 1}`}
                                  className={`w-full h-full object-cover ${isMainImage ? 'ring-2 ring-blue-500' : ''}`}
                                  onError={(e) => {
                                    // Hatalı görseli gizle
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                                
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="text-white text-xs font-medium bg-black/70 px-2 py-1 rounded mb-2">
                                    {idx + 1}/{allImages.length}
                                  </span>
                                  
                                  {/* Ana Görsel Yap butonu */}
                                  {!isMainImage && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setAsMainImage(showViewModal.product!.id, img)
                                      }}
                                      disabled={isLoading}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                      {isLoading ? (
                                        <>
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          Güncelleniyor...
                                        </>
                                      ) : (
                                        <>
                                          <Star className="w-3 h-3" />
                                          Ana Görsel Yap
                                        </>
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Zaten ana görsel ise check işareti */}
                                  {isMainImage && (
                                    <div className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-lg">
                                      <Check className="w-3 h-3" />
                                      Ana Görsel
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                  onClick={() => openEdit(showViewModal.product!)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={()=>setShowViewModal({ open:false, product:null, details:null, variations:[], sizeStocks: {} })} 
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
