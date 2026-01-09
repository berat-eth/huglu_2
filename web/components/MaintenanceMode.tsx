'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  useTheme,
  Stack,
  Container,
} from '@mui/material'
import {
  Refresh,
} from '@mui/icons-material'

interface MaintenanceModeData {
  enabled: boolean
  message: string
  estimatedEndTime: string | null
}

export default function MaintenanceMode() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceModeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
        const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
        
        const response = await fetch(`${API_BASE_URL}/maintenance/status?platform=web`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          if (data?.success && data?.data?.enabled) {
            setMaintenanceData({
              enabled: true,
              message: data.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
              estimatedEndTime: data.data.estimatedEndTime || null
            })
          } else {
            setMaintenanceData(null)
          }
        } else {
          setMaintenanceData(null)
        }
      } catch (error) {
        console.error('Bakım modu kontrolü başarısız:', error)
        setMaintenanceData(null)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    checkMaintenance()
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkMaintenance, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      
      const response = await fetch(`${API_BASE_URL}/maintenance/status?platform=web`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.success && !data?.data?.enabled) {
          // Bakım modu kapatılmış, sayfayı yenile
          window.location.reload()
        } else if (data?.success && data?.data?.enabled) {
          setMaintenanceData({
            enabled: true,
            message: data.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
            estimatedEndTime: data.data.estimatedEndTime || null
          })
        }
      }
    } catch (error) {
      console.error('Bakım modu kontrolü başarısız:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading) {
    return null
  }

  if (!maintenanceData?.enabled) {
    return null
  }

  const formatEstimatedTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff < 0) return null
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours} saat ${minutes} dakika`
    }
    return `${minutes} dakika`
  }

  const estimatedTimeRemaining = maintenanceData.estimatedEndTime 
    ? formatEstimatedTime(maintenanceData.estimatedEndTime)
    : null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        minHeight: '100vh',
        overflow: 'auto',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 6, minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Card
          elevation={8}
          sx={{
            width: '100%',
            borderRadius: 4,
            position: 'relative',
            background: '#ffffff',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent sx={{ p: 4, position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {/* Logo */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Image
                src="/assets/logo.png"
                alt="Huğlu Tekstil Logo"
                width={280}
                height={280}
                style={{
                  width: '280px',
                  height: '280px',
                  objectFit: 'contain',
                }}
                priority
              />
            </Box>

            {/* Maintenance Status */}
            <Box sx={{ mb: 4 }}>
              <Chip
                label="Sistem Bakımda"
                color="warning"
                sx={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  mb: 3,
                  py: 2,
                  px: 3,
                }}
              />
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  lineHeight: 1.7,
                }}
              >
                {maintenanceData.message}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 4 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleRefresh}
                disabled={isRefreshing}
                startIcon={
                  isRefreshing ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Refresh />
                  )
                }
                sx={{
                  flex: 1,
                  py: 1.25,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                {isRefreshing ? 'Kontrol Ediliyor...' : 'Tekrar Dene'}
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => window.location.reload()}
                startIcon={<Refresh />}
                sx={{
                  flex: 1,
                  py: 1.25,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Sayfayı Yenile
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
