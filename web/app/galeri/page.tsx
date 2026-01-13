'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

interface GalleryImage {
  id: number
  src: string
  alt: string
  category: string
  title?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'wide'
}

const galleryImages: GalleryImage[] = [
  // Atölye Görselleri
  { id: 1, src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80', alt: 'Atölye İçi', category: 'Atölye', title: 'Modern Üretim Hattı', aspectRatio: 'wide' },
  { id: 2, src: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', alt: 'Dikim Atölyesi', category: 'Atölye', title: 'Profesyonel Dikim', aspectRatio: 'portrait' },
  { id: 3, src: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', alt: 'Kesim Masası', category: 'Atölye', title: 'Hassas Kesim', aspectRatio: 'square' },
  { id: 4, src: 'https://images.unsplash.com/photo-1558769132-cb1aea1f1c85?w=800&q=80', alt: 'Tasarım Masası', category: 'Atölye', title: 'Yaratıcı Tasarım', aspectRatio: 'landscape' },
  
  // Ürün Görselleri
  { id: 5, src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', alt: 'İş Kıyafetleri', category: 'Ürünler', title: 'Kurumsal Koleksiyon', aspectRatio: 'portrait' },
  { id: 6, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Tişört Üretimi', category: 'Ürünler', title: 'Kaliteli Tişörtler', aspectRatio: 'square' },
  { id: 7, src: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', alt: 'Polo Yaka', category: 'Ürünler', title: 'Şık Polo Yaka', aspectRatio: 'portrait' },
  { id: 8, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Gömlek', category: 'Ürünler', title: 'Klasik Gömlekler', aspectRatio: 'landscape' },
  
  // Ekipman
  { id: 9, src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', alt: 'Kalite Kontrol', category: 'Ekipman', title: 'Kalite Kontrol', aspectRatio: 'wide' },
  { id: 10, src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', alt: 'Modern Makineler', category: 'Ekipman', title: 'Teknolojik Makineler', aspectRatio: 'square' },
  { id: 11, src: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80', alt: 'Üretim Hattı', category: 'Ekipman', title: 'Otomatik Üretim', aspectRatio: 'landscape' },
  { id: 12, src: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80', alt: 'Baskı Makinesi', category: 'Ekipman', title: 'Dijital Baskı', aspectRatio: 'portrait' },
  
  // Ekip
  { id: 13, src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80', alt: 'Ekip Çalışması', category: 'Ekip', title: 'Profesyonel Ekip', aspectRatio: 'wide' },
  { id: 14, src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', alt: 'Takım Çalışması', category: 'Ekip', title: 'Uyumlu Takım', aspectRatio: 'square' },
  { id: 15, src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', alt: 'Müşteri Görüşmesi', category: 'Ekip', title: 'Müşteri Odaklı', aspectRatio: 'portrait' },
  { id: 16, src: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', alt: 'Toplantı', category: 'Ekip', title: 'İnovatif Çözümler', aspectRatio: 'landscape' },
]

const categories = ['Tümü', 'Atölye', 'Ürünler', 'Ekipman', 'Ekip']

const getAspectRatioClass = (aspectRatio?: string) => {
  switch (aspectRatio) {
    case 'portrait':
      return 'aspect-[3/4]'
    case 'landscape':
      return 'aspect-[4/3]'
    case 'wide':
      return 'aspect-[16/9]'
    default:
      return 'aspect-square'
  }
}

export default function Galeri() {
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showNoContentModal, setShowNoContentModal] = useState(true)

  const filteredImages = useMemo(() => {
    return selectedCategory === 'Tümü' 
      ? galleryImages 
      : galleryImages.filter(img => img.category === selectedCategory)
  }, [selectedCategory])

  // Lightbox navigation
  const currentImageIndex = useMemo(() => {
    if (!selectedImage) return -1
    return filteredImages.findIndex(img => img.id === selectedImage.id)
  }, [selectedImage, filteredImages])

  const goToNext = useCallback(() => {
    if (currentImageIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentImageIndex + 1])
      setLightboxIndex(currentImageIndex + 1)
    } else {
      setSelectedImage(filteredImages[0])
      setLightboxIndex(0)
    }
  }, [currentImageIndex, filteredImages])

  const goToPrev = useCallback(() => {
    if (currentImageIndex > 0) {
      setSelectedImage(filteredImages[currentImageIndex - 1])
      setLightboxIndex(currentImageIndex - 1)
    } else {
      setSelectedImage(filteredImages[filteredImages.length - 1])
      setLightboxIndex(filteredImages.length - 1)
    }
  }, [currentImageIndex, filteredImages])

  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
      } else if (e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'ArrowLeft') {
        goToPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, goToNext, goToPrev])

  // Simulate loading
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [selectedCategory])

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image)
    const index = filteredImages.findIndex(img => img.id === image.id)
    setLightboxIndex(index)
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16 pt-24">
        <div className="max-w-[1600px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-full border border-white/20 dark:border-blue-500/30 mb-6 shadow-lg">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">photo_library</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wide">FOTOĞRAF GALERİSİ</span>
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 leading-tight">
              Galeri
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Atölyemizden, ürünlerimizden ve ekibimizden kareler
            </p>
          </div>

          {/* İçerik gizlendi - Modal gösterilecek */}
        </div>
      </main>

      {/* İçerik Yok Modal */}
      {showNoContentModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setShowNoContentModal(false)}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowNoContentModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <span className="material-symbols-outlined text-white text-5xl">info</span>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-4">
                İçerik Bulunamadı
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
                Şu anda bu sayfada içerik yok. Lütfen daha sonra tekrar deneyin.
              </p>
              <button
                onClick={() => setShowNoContentModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Navigation Buttons */}
          {filteredImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrev()
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl group"
                aria-label="Önceki"
              >
                <span className="material-symbols-outlined text-3xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl group"
                aria-label="Sonraki"
              >
                <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </>
          )}

          {/* Image Container */}
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                unoptimized
                priority
              />
            </div>
            
            {/* Image Info */}
            <div className="mt-6 text-center">
              {selectedImage.title && (
                <h3 className="text-white text-3xl md:text-4xl font-black mb-3 drop-shadow-lg">
                  {selectedImage.title}
                </h3>
              )}
              <div className="flex items-center justify-center gap-4">
                <span className="px-4 py-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm rounded-full text-white text-sm font-bold">
                  {selectedImage.category}
                </span>
                <span className="text-white/60 text-sm">
                  {currentImageIndex + 1} / {filteredImages.length}
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
            <span className="text-white/60 text-xs">
              ← → tuşları ile gezin • ESC ile kapat
            </span>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  )
}
