'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import dynamic from 'next/dynamic'
import MaintenanceMode from '@/components/MaintenanceMode'
import { ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material'

const WhatsAppWrapper = dynamic(() => import('@/components/WhatsAppWrapper'), {
  ssr: false,
})

const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // blue-600
      light: '#3b82f6', // blue-500
      dark: '#1d4ed8', // blue-700
    },
    secondary: {
      main: '#9333ea', // purple-600
      light: '#a855f7', // purple-500
      dark: '#7e22ce', // purple-700
    },
    error: {
      main: '#ec4899', // pink-600
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Open Sans',
      'Montserrat',
      'Poppins',
      'system-ui',
      '-apple-system',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 900,
      fontSize: '3.5rem',
      lineHeight: 1.1,
    },
    h2: {
      fontWeight: 900,
      fontSize: '3rem',
      lineHeight: 1.1,
    },
    h3: {
      fontWeight: 800,
      fontSize: '2.25rem',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 32px',
          fontSize: '1rem',
          fontWeight: 700,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider>
        <AuthProvider>
          <MaintenanceMode />
          {children}
          <WhatsAppWrapper />
        </AuthProvider>
      </ThemeProvider>
    </MuiThemeProvider>
  )
}

