'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Search, X, Package, Link2, File, Check, AlertCircle, Loader2, Box, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { productService } from '@/lib/services'
import { api, type ApiResponse } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'

interface Model3D {
  filename: string
  url: string
  format: string
  size: number
  uploadedAt: string
}

interface Product {
  id: number
  name: string
  model3dUrl?: string
  model3dFormat?: string
}

export default function ThreeDModels() {
  const [models, setModels] = useState<Model3D[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedModel, setSelectedModel] = useState<Model3D | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningProductId, setAssigningProductId] = useState<number | null>(null)
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    loadModels()
    loadProducts()
  }, [])

  const loadModels = async () => {
    try {
      setLoading(true)
      const response = await productService.getModel3dList()
      if (response.success && response.data) {
        setModels(response.data)
      }
    } catch (err: any) {
      setError(err.message || 'Modeller yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await api.get<ApiResponse<Product[]>>('/admin/products?limit=1000')
      if (response.success && response.data) {
        setProducts(response.data)
      }
    } catch (err: any) {
      console.error('Ürünler yüklenirken hata:', err)
    }
  }

  const handleFileSelect = async (file: File) => {
    const allowedFormats = ['.obj', '.glb', '.gltf', '.usdz']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedFormats.includes(fileExt)) {
      setError('Sadece .obj, .glb, .gltf, .usdz formatları desteklenir')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Dosya boyutu 50MB\'dan küçük olmalıdır')
      return
    }

    try {
      setUploading(true)
      setError(null)
      const response = await productService.uploadModel3d(file)
      if (response.success) {
        setSuccess('3D model başarıyla yüklendi')
        await loadModels()
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Model yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" modelini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingFilename(filename)
      const response = await productService.deleteModel3d(filename)
      if (response.success) {
        setSuccess('Model başarıyla silindi')
        await loadModels()
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Model silinirken hata oluştu')
    } finally {
      setDeletingFilename(null)
    }
  }

  const handleAssign = async (productId: number, modelUrl: string, modelFormat: string) => {
    try {
      setAssigningProductId(productId)
      const response = await productService.assignModelToProduct(productId, modelUrl, modelFormat)
      if (response.success) {
        setSuccess('3D model ürüne başarıyla atandı')
        await loadProducts()
        setShowAssignModal(false)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Model atanırken hata oluştu')
    } finally {
      setAssigningProductId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredModels = models.filter(model =>
    model.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  const productsWithModels = products.filter(p => p.model3dUrl)
  const productsWithoutModels = products.filter(p => !p.model3dUrl)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">3D Modeller</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ürünlere 3D model ekleme ve yönetimi</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Section */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">3D Model Yükle</h3>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".obj,.glb,.gltf,.usdz"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <Box className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            Dosyayı buraya sürükleyin veya tıklayın
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
            Desteklenen formatlar: .obj, .glb, .gltf, .usdz (Maksimum 50MB)
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Dosya Seç
              </>
            )}
          </button>
        </div>
      </div>

      {/* Models List */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Yüklenen Modeller ({filteredModels.length})
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Model ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {filteredModels.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Cube className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Henüz model yüklenmemiş</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <motion.div
                key={model.filename}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <File className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {model.filename}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                      <p>Format: <span className="font-medium">{model.format.toUpperCase()}</span></p>
                      <p>Boyut: {formatFileSize(model.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(model.filename)}
                    disabled={deletingFilename === model.filename}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                  >
                    {deletingFilename === model.filename ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setSelectedModel(model)
                      setShowAssignModal(true)
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Ürüne Ata
                  </button>
                  <a
                    href={`${API_BASE_URL.replace('/api', '')}${model.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Görüntüle
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Products with Models */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Ürünlere Atanan Modeller ({productsWithModels.length})
        </h3>
        {productsWithModels.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            Henüz hiçbir ürüne model atanmamış
          </p>
        ) : (
          <div className="space-y-2">
            {productsWithModels.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{product.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Format: {product.model3dFormat?.toUpperCase() || 'Bilinmiyor'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAssign(product.id, '', '')}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && selectedModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Ürüne Model Ata
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Seçilen Model: <span className="font-medium">{selectedModel.filename}</span>
                  </p>
                </div>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAssign(product.id, selectedModel.url, selectedModel.format)}
                      disabled={assigningProductId === product.id}
                      className="w-full text-left p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-900 dark:text-slate-100">{product.name}</span>
                      </div>
                      {assigningProductId === product.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

