'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'
import {
  Box,
  Container,
  Card,
  CardContent,
  Button,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  Stack,
  Avatar,
  Rating,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Zoom,
  Slide
} from '@mui/material'
import {
  ShoppingBag,
  NotificationsActive,
  LocalShipping,
  Payment,
  PhotoLibrary,
  Reviews,
  Update,
  Star,
  CheckCircle,
  Download,
  Android,
  Close,
  Smartphone
} from '@mui/icons-material'

const Header = dynamic(() => import('@/components/Header'), { ssr: true })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: true })

export default function MobilUygulamaPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null)

  const handleStoreClick = (storeName: string) => {
    alert(`${storeName} uygulaması çok yakında yayınlanacak! Şimdilik APK dosyasını indirerek uygulamayı kullanabilirsiniz.`)
  }

  const features = [
    {
      icon: ShoppingBag,
      title: 'Kolay Alışveriş',
      description: 'Binlerce ürün arasından kolayca arama yapın ve sepetinize ekleyin',
      color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: NotificationsActive,
      title: 'Anlık Bildirimler',
      description: 'Kampanyalar ve yeni ürünlerden anında haberdar olun',
      color: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)'
    },
    {
      icon: LocalShipping,
      title: 'Hızlı Kargo',
      description: 'Siparişlerinizi takip edin ve hızlı teslimat alın',
      color: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
    },
    {
      icon: Payment,
      title: 'Güvenli Ödeme',
      description: 'Tüm ödeme yöntemleriyle güvenli alışveriş yapın',
      color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    }
  ]

  const screenshots = [
    { image: '/assets/Başlangiç.png', title: 'Başlangıç' },
    { image: '/assets/Ana Sayfa.png', title: 'Ana Sayfa' },
    { image: '/assets/Tüm ürünler.png', title: 'Tüm Ürünler' },
    { image: '/assets/favorilerim.png', title: 'Favorilerim' },
    { image: '/assets/profil.png', title: 'Profil' }
  ]

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        background: 'linear-gradient(135deg, #f9fafb 0%, rgba(239, 246, 255, 0.3) 50%, rgba(250, 245, 255, 0.2) 100%)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Header />

        <Box component="main" sx={{ flexGrow: 1 }}>
          {/* Hero Section - Material UI */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '24rem',
                height: '24rem',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(80px)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '24rem',
                height: '24rem',
                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(80px)',
              },
            }}
          >
            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: { xs: 10, md: 16 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
                {/* Left Content */}
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Stack spacing={4} alignItems={{ xs: 'center', md: 'flex-start' }}>
                    <Slide direction="down" in timeout={800}>
                      <Chip
                        icon={<Smartphone sx={{ fontSize: 16 }} />}
                        label="Yakında"
                        sx={{
                          alignSelf: { xs: 'center', md: 'flex-start' },
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      />
                    </Slide>
                    
                    <Slide direction="up" in timeout={1000}>
                      <Typography
                        variant="h1"
                        sx={{
                          fontFamily: 'Poppins, Montserrat, sans-serif',
                          fontSize: { xs: '3rem', md: '4.5rem', lg: '5.5rem' },
                          fontWeight: 900,
                          lineHeight: 1.1,
                          letterSpacing: '-0.02em',
                          mb: 2,
                          textAlign: { xs: 'center', md: 'left' },
                        }}
                      >
                        <Box component="span" sx={{ color: '#0d141b', display: 'block' }}>
                          Alışverişi
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            display: 'block',
                          }}
                        >
                          Yeniden Keşfedin
                        </Box>
                      </Typography>
                    </Slide>
                    
                    <Slide direction="up" in timeout={1200}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: { xs: '1.125rem', md: '1.25rem' },
                          color: 'text.secondary',
                          lineHeight: 1.75,
                          maxWidth: '32rem',
                          fontWeight: 400,
                          textAlign: { xs: 'center', md: 'left' },
                        }}
                      >
                        Mobil uygulamamızla her yerden, her zaman alışveriş yapın. Özel kampanyalar ve indirimlerden ilk siz haberdar olun.
                      </Typography>
                    </Slide>

                    {/* Download Buttons */}
                    <Slide direction="up" in timeout={1400}>
                      <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                          <Button
                            onClick={() => handleStoreClick('App Store')}
                            variant="contained"
                            startIcon={
                              <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                            }
                            sx={{
                              background: '#000',
                              color: 'white',
                              px: 3,
                              py: 1.5,
                              borderRadius: 3,
                              fontWeight: 700,
                              fontSize: '1rem',
                              textTransform: 'none',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                              '&:hover': {
                                background: '#1a1a1a',
                                transform: 'scale(1.05)',
                              },
                            }}
                          >
                            <Stack direction="column" alignItems="flex-start" spacing={0}>
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                App Store'dan
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                İndir
                              </Typography>
                            </Stack>
                          </Button>

                          <Button
                            onClick={() => handleStoreClick('Google Play')}
                            variant="contained"
                            startIcon={
                              <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                              </svg>
                            }
                            sx={{
                              background: '#000',
                              color: 'white',
                              px: 3,
                              py: 1.5,
                              borderRadius: 3,
                              fontWeight: 700,
                              fontSize: '1rem',
                              textTransform: 'none',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                              '&:hover': {
                                background: '#1a1a1a',
                                transform: 'scale(1.05)',
                              },
                            }}
                          >
                            <Stack direction="column" alignItems="flex-start" spacing={0}>
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                Google Play'den
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                İndir
                              </Typography>
                            </Stack>
                          </Button>
                        </Stack>

                        <Button
                          component="a"
                          href="https://app.beratsimsek.com.tr/1.apk"
                          download
                          variant="contained"
                          startIcon={<Android />}
                          endIcon={<Download />}
                          sx={{
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            color: 'white',
                            px: 3,
                            py: 1.5,
                            borderRadius: 3,
                            fontWeight: 700,
                            fontSize: '1rem',
                            textTransform: 'none',
                            boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <Stack direction="column" alignItems="flex-start" spacing={0}>
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
                              Doğrudan İndir
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                              APK Dosyası
                            </Typography>
                          </Stack>
                        </Button>
                      </Stack>
                    </Slide>

                    {/* Stats */}
                    <Slide direction="up" in timeout={1600}>
                      <Stack direction="row" spacing={6} sx={{ pt: 2 }} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 900,
                              background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            50K+
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            İndirme
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 900,
                              background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            4.8
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Puan
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 900,
                              background: 'linear-gradient(135deg, #ec4899 0%, #dc2626 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            10K+
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Yorum
                          </Typography>
                        </Box>
                      </Stack>
                    </Slide>
                  </Stack>
                </Box>

                {/* Right Content - Phone Mockup */}
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Zoom in timeout={1500}>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: { xs: 300, md: 350 },
                          height: { xs: 600, md: 700 },
                        }}
                      >
                        {/* Phone Frame */}
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                            borderRadius: '3rem',
                            p: 1.5,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              background: 'white',
                              borderRadius: '2.5rem',
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            {/* Notch */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 160,
                                height: 28,
                                background: '#1f2937',
                                borderRadius: '0 0 1.5rem 1.5rem',
                                zIndex: 10,
                              }}
                            />
                            
                            {/* Screen Content */}
                            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                              <Image
                                src="/assets/Ana Sayfa.png"
                                alt="Ana Sayfa"
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        {/* Floating Elements */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -16,
                            right: -16,
                            width: 80,
                            height: 80,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: 3,
                            boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'bounce 2s infinite',
                            '@keyframes bounce': {
                              '0%, 100%': { transform: 'translateY(0)' },
                              '50%': { transform: 'translateY(-10px)' },
                            },
                          }}
                        >
                          <NotificationsActive sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: -16,
                            left: -16,
                            width: 80,
                            height: 80,
                            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                            borderRadius: 3,
                            boxShadow: '0 20px 25px -5px rgba(236, 72, 153, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.7 },
                            },
                          }}
                        >
                          <Star sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                      </Box>
                    </Box>
                  </Zoom>
                </Box>
              </Stack>
            </Container>
          </Box>

          <Container maxWidth="lg" sx={{ py: 8 }}>
            {/* Features Section - Material UI */}
            <Box sx={{ py: 8 }}>
              <Stack spacing={6} alignItems="center" sx={{ mb: 6 }}>
                <Slide direction="down" in timeout={800}>
                  <Chip
                    icon={<Star sx={{ fontSize: 16 }} />}
                    label="Özellikler"
                    sx={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                </Slide>
                
                <Slide direction="up" in timeout={1000}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'Poppins, Montserrat, sans-serif',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      fontWeight: 900,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    <Box component="span" sx={{ color: '#0d141b' }}>
                      Neden{' '}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Mobil Uygulamamız?
                    </Box>
                  </Typography>
                </Slide>
                
                <Slide direction="up" in timeout={1200}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: '1.125rem',
                      color: 'text.secondary',
                      textAlign: 'center',
                      maxWidth: '42rem',
                    }}
                  >
                    Alışveriş deneyiminizi bir üst seviyeye taşıyacak özelliklerle dolu
                  </Typography>
                </Slide>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, justifyContent: 'center' }}>
                {features.map((feature, index) => {
                  const IconComponent = feature.icon
                  return (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Fade in timeout={1000 + index * 200}>
                        <Card
                          onMouseEnter={() => setActiveFeature(index)}
                          sx={{
                            height: '100%',
                            width: '100%',
                            maxWidth: '400px',
                            p: 3,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: activeFeature === index ? '2px solid #2563eb' : '1px solid rgba(0, 0, 0, 0.12)',
                            boxShadow: activeFeature === index
                              ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            transform: activeFeature === index ? 'scale(1.05)' : 'scale(1)',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Stack spacing={3}>
                              <Box
                                sx={{
                                  width: 64,
                                  height: 64,
                                  background: feature.color,
                                  borderRadius: 3,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                  transition: 'transform 0.3s ease',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                <IconComponent sx={{ fontSize: 32, color: 'white' }} />
                              </Box>
                              <Stack spacing={1}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0d141b' }}>
                                  {feature.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {feature.description}
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Fade>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Screenshots Section - Material UI */}
            <Box sx={{ py: 8 }}>
              <Stack spacing={6} alignItems="center" sx={{ mb: 6 }}>
                <Slide direction="down" in timeout={800}>
                  <Chip
                    icon={<PhotoLibrary sx={{ fontSize: 16 }} />}
                    label="Ekran Görüntüleri"
                    sx={{
                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                      border: '1px solid rgba(147, 51, 234, 0.3)',
                      color: '#9333ea',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                </Slide>
                
                <Slide direction="up" in timeout={1000}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'Poppins, Montserrat, sans-serif',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      fontWeight: 900,
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Uygulamayı Keşfedin
                  </Typography>
                </Slide>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 3, justifyContent: 'center' }}>
                {screenshots.map((screenshot, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Fade in timeout={1000 + index * 100}>
                      <Card
                        onClick={() => setSelectedScreenshot(index)}
                        sx={{
                          width: '100%',
                          maxWidth: '200px',
                          cursor: 'pointer',
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '4px solid #1f2937',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                          },
                        }}
                      >
                        <Box sx={{ position: 'relative', width: '100%', pb: '200%' }}>
                          <Image
                            src={screenshot.image}
                            alt={screenshot.title}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
                              opacity: 0,
                              transition: 'opacity 0.3s ease',
                              display: 'flex',
                              alignItems: 'flex-end',
                              p: 2,
                              '&:hover': {
                                opacity: 1,
                              },
                            }}
                          >
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 700 }}>
                              {screenshot.title}
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Fade>
                  </Box>
                ))}
              </Box>

              {/* Screenshot Modal */}
              <Dialog
                open={selectedScreenshot !== null}
                onClose={() => setSelectedScreenshot(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                  sx: {
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(8px)',
                  },
                }}
              >
                <DialogContent sx={{ p: 0, position: 'relative' }}>
                  <IconButton
                    onClick={() => setSelectedScreenshot(null)}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 1,
                      color: 'white',
                      background: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <Close />
                  </IconButton>
                  {selectedScreenshot !== null && (
                    <>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          pb: '200%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '4px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Image
                          src={screenshots[selectedScreenshot].image}
                          alt={screenshots[selectedScreenshot].title}
                          fill
                          style={{ objectFit: 'contain' }}
                        />
                      </Box>
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                          {screenshots[selectedScreenshot].title}
                        </Typography>
                      </Box>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </Box>

            {/* Testimonials Section - Material UI */}
            <Box sx={{ py: 8 }}>
              <Stack spacing={6} alignItems="center" sx={{ mb: 6 }}>
                <Slide direction="down" in timeout={800}>
                  <Chip
                    icon={<Reviews sx={{ fontSize: 16 }} />}
                    label="Kullanıcı Yorumları"
                    sx={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                </Slide>
                
                <Slide direction="up" in timeout={1000}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'Poppins, Montserrat, sans-serif',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      fontWeight: 900,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    <Box component="span" sx={{ color: '#0d141b' }}>
                      Kullanıcılarımız{' '}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Ne Diyor?
                    </Box>
                  </Typography>
                </Slide>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, justifyContent: 'center' }}>
                {[
                  { name: 'Zeynep K.', rating: 5, comment: 'Harika bir uygulama! Kullanımı çok kolay ve hızlı. Artık tüm alışverişlerimi buradan yapıyorum.' },
                  { name: 'Mehmet A.', rating: 5, comment: 'Kampanyalardan anında haberdar olmak çok güzel. Uygulama çok akıcı çalışıyor.' },
                  { name: 'Ayşe Y.', rating: 5, comment: 'Ödeme sistemi çok güvenli. Siparişlerimi kolayca takip edebiliyorum. Kesinlikle tavsiye ederim!' }
                ].map((review, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Fade in timeout={1000 + index * 200}>
                      <Card
                        sx={{
                          height: '100%',
                          width: '100%',
                          maxWidth: '400px',
                          p: 3,
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(24px)',
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                          <Stack spacing={3}>
                            <Rating value={review.rating} readOnly sx={{ color: '#fbbf24' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                lineHeight: 1.75,
                                fontStyle: 'italic',
                              }}
                            >
                              &quot;{review.comment}&quot;
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar
                                sx={{
                                  background: 'linear-gradient(135deg, #60a5fa 0%, #9333ea 100%)',
                                  fontWeight: 700,
                                }}
                              >
                                {review.name.charAt(0)}
                              </Avatar>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0d141b' }}>
                                {review.name}
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Update Notes Section - Material UI */}
            <Box sx={{ py: 8 }}>
              <Stack spacing={6} alignItems="center" sx={{ mb: 6 }}>
                <Slide direction="down" in timeout={800}>
                  <Chip
                    icon={<Update sx={{ fontSize: 16 }} />}
                    label="Güncelleme Notları"
                    sx={{
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      color: '#f97316',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                </Slide>
                
                <Slide direction="up" in timeout={1000}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'Poppins, Montserrat, sans-serif',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      fontWeight: 900,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    <Box component="span" sx={{ color: '#0d141b' }}>
                      Son{' '}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Güncellemeler
                    </Box>
                  </Typography>
                </Slide>
              </Stack>

              <Stack spacing={3} sx={{ maxWidth: '56rem', mx: 'auto' }}>
                {[
                  {
                    version: 'v3.1.0',
                    date: '5 Ocak 2026',
                    badge: 'Performans',
                    badgeColor: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    updates: [
                      'Uygulama açılış hızı %60 iyileştirildi - daha hızlı başlangıç',
                      'Görsel yükleme performansı %45 artırıldı - anında görüntüleme',
                      'Bellek kullanımı %35 azaltıldı - daha verimli çalışma',
                      'API yanıt süreleri optimize edildi - daha hızlı veri yükleme',
                      'Arka plan işlemleri iyileştirildi - daha akıcı deneyim',
                      'Önbellek (cache) sistemi geliştirildi - daha hızlı veri yükleme',
                      'Veritabanı sorguları optimize edildi - hızlı arama sonuçları',
                      'Görsel sıkıştırma algoritması güncellendi - daha küçük dosya boyutları',
                      'Sayfa geçiş animasyonları optimize edildi - pürüzsüz navigasyon',
                      'Battery kullanımı %25 azaltıldı - daha uzun pil ömrü',
                      'Network istekleri optimize edildi - daha az veri kullanımı',
                      'Uygulama boyutu %20 küçültüldü - daha hızlı indirme',
                      'Startup süresi %55 kısaltıldı - anında kullanıma hazır',
                      'Scroll performansı iyileştirildi - akıcı kaydırma',
                      'Image lazy loading sistemi eklendi - daha hızlı sayfa yükleme',
                      'Genel performans optimizasyonları - daha hızlı ve verimli uygulama'
                    ]
                  },
                  {
                    version: 'v3.0.0',
                    date: '25 Aralık 2025',
                    badge: 'Büyük Güncelleme',
                    badgeColor: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                    updates: [
                      'Yenilenen kullanıcı arayüzü - daha modern ve kullanıcı dostu tasarım',
                      'Gelişmiş arama özellikleri - daha hızlı ve akıllı ürün arama',
                      'Yeni ödeme yöntemleri - taksit seçenekleri ve cüzdan entegrasyonu',
                      'Gelişmiş favoriler sistemi - kategorilere göre organize edilmiş listeler',
                      'Yeni bildirim merkezi - tüm bildirimleri tek yerden yönetme',
                      'Performans iyileştirmeleri - uygulama açılış hızı %50 iyileştirildi',
                      'Gelişmiş filtreleme seçenekleri - fiyat, renk, beden, marka filtreleri',
                      'Yeni ürün değerlendirme sistemi - fotoğraf ile detaylı yorumlar',
                      'Geliştirilmiş sepet yönetimi - kaydedilmiş sepetler ve hızlı sipariş',
                      'Geliştirilmiş hesap yönetimi - detaylı sipariş geçmişi',
                      'Ürün hatırlatıcıları - stokta olmayan ürünler için bildirim',
                      'Geliştirilmiş ödeme güvenliği - güvenli ödeme altyapısı',
                      'Hızlı sipariş özelliği - tek tıkla tekrar sipariş verme',
                      'Çoklu adres yönetimi - sınırsız adres ekleme ve düzenleme',
                      'Görsel yükleme optimizasyonu - daha hızlı görsel yükleme',
                      'Geliştirilmiş kullanıcı deneyimi - daha akıcı navigasyon'
                    ]
                  },
                  {
                    version: 'v2.6.0',
                    date: '23 Ekim 2025',
                    badge: 'Yeni',
                    badgeColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    updates: [
                      'Uygulama açılış hızı %40 iyileştirildi',
                      'Görsel yükleme süreleri optimize edildi',
                      'Bellek kullanımı azaltıldı',
                      'Arka plan işlemleri optimize edildi',
                      'Genel performans iyileştirmeleri'
                    ]
                  },
                  {
                    version: 'v2.5.0',
                    date: '27 Eylül 2025',
                    updates: [
                      'Yeni ödeme yöntemleri eklendi',
                      'Sepet sayfası yenilendi',
                      'Performans iyileştirmeleri',
                      'Hata düzeltmeleri'
                    ]
                  },
                  {
                    version: 'v2.4.0',
                    date: '15 Ağustos 2025',
                    updates: [
                      'Favori ürünler özelliği',
                      'Bildirim ayarları güncellendi',
                      'Arayüz iyileştirmeleri'
                    ]
                  },
                  {
                    version: 'v2.3.0',
                    date: '27 Temmuz 2025',
                    updates: [
                      'Sipariş takip sistemi yenilendi',
                      'Ürün filtreleme seçenekleri eklendi',
                      'Hızlı ödeme özelliği',
                      'Güvenlik güncellemeleri'
                    ]
                  }
                ].map((update, index) => (
                  <Fade in timeout={1000 + index * 100} key={index}>
                    <Card
                      sx={{
                        p: 3,
                        transition: 'all 0.3s ease',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <Stack spacing={3}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            justifyContent="space-between"
                          >
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
                                  borderRadius: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                }}
                              >
                                <Update sx={{ fontSize: 24, color: 'white' }} />
                              </Box>
                              <Stack>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0d141b' }}>
                                  {update.version}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {update.date}
                                </Typography>
                              </Stack>
                            </Stack>
                            {update.badge && (
                              <Chip
                                label={update.badge}
                                icon={<Star sx={{ fontSize: 16 }} />}
                                sx={{
                                  background: update.badgeColor,
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              />
                            )}
                          </Stack>
                          <List>
                            {update.updates.map((item, i) => (
                              <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <CheckCircle sx={{ color: '#2563eb', fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={item}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    color: 'text.secondary',
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Fade>
                ))}
              </Stack>
            </Box>

            {/* CTA Section - Material UI */}
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #ec4899 100%)',
                borderRadius: 4,
                p: { xs: 4, md: 8 },
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '24rem',
                  height: '24rem',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                  borderRadius: '50%',
                  transform: 'translate(50%, -50%)',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '18rem',
                  height: '18rem',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, 50%)',
                },
              }}
            >
              <Stack spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Slide direction="down" in timeout={800}>
                  <Chip
                    icon={<Download sx={{ fontSize: 16 }} />}
                    label="Hemen İndirin"
                    sx={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                </Slide>
                
                <Slide direction="up" in timeout={1000}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'Poppins, Montserrat, sans-serif',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      fontWeight: 900,
                      textAlign: 'center',
                      color: 'white',
                      textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    Alışverişe Başlamaya Hazır mısınız?
                  </Typography>
                </Slide>
                
                <Slide direction="up" in timeout={1200}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: '1.125rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      textAlign: 'center',
                      maxWidth: '42rem',
                      lineHeight: 1.75,
                    }}
                  >
                    Mobil uygulamamızı indirin ve özel kampanyalardan yararlanmaya başlayın. İlk siparişinizde %20 indirim!
                  </Typography>
                </Slide>

                <Slide direction="up" in timeout={1400}>
                  <Stack spacing={2} sx={{ width: '100%', maxWidth: '32rem' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        onClick={() => handleStoreClick('App Store')}
                        variant="contained"
                        startIcon={
                          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                        }
                        sx={{
                          background: '#000',
                          color: 'white',
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          fontWeight: 700,
                          fontSize: '1rem',
                          textTransform: 'none',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                          '&:hover': {
                            background: '#1a1a1a',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <Stack direction="column" alignItems="flex-start" spacing={0}>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            App Store
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                            İndir
                          </Typography>
                        </Stack>
                      </Button>

                      <Button
                        onClick={() => handleStoreClick('Google Play')}
                        variant="contained"
                        startIcon={
                          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                          </svg>
                        }
                        sx={{
                          background: 'white',
                          color: '#0d141b',
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          fontWeight: 700,
                          fontSize: '1rem',
                          textTransform: 'none',
                          boxShadow: '0 20px 25px -5px rgba(255, 255, 255, 0.3)',
                          '&:hover': {
                            background: '#f3f4f6',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <Stack direction="column" alignItems="flex-start" spacing={0}>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            Google Play
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                            İndir
                          </Typography>
                        </Stack>
                      </Button>
                    </Stack>

                    <Button
                      component="a"
                      href="https://app.beratsimsek.com.tr/1.apk"
                      download
                      variant="contained"
                      startIcon={<Android />}
                      endIcon={<Download />}
                      sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 700,
                        fontSize: '1rem',
                        textTransform: 'none',
                        boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      <Stack direction="column" alignItems="flex-start" spacing={0}>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
                          Doğrudan İndir
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                          APK Dosyası
                        </Typography>
                      </Stack>
                    </Button>
                  </Stack>
                </Slide>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Footer />
      </Box>
    </Box>
  )
}
