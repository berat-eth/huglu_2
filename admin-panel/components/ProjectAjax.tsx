'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, User, Bot, Loader2, TrendingUp, FileText, Code, Lightbulb, Database, Table, Search, Play, Download, Eye, Settings, BarChart3, Activity, Brain, TestTube2, Volume2, VolumeX, Mic, MicOff, Trash2, Upload, X, Plus, Pause, PlayCircle, Sliders } from 'lucide-react'
import { GeminiService, GeminiConfig, GeminiMessage } from '@/lib/services/gemini-service'
import { ElevenLabsService, ElevenLabsConfig } from '@/lib/services/elevenlabs-service'
import { productService, orderService } from '@/lib/services'
import { api } from '@/lib/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isTyping?: boolean
}


interface DatabaseTable {
    name: string
    columns: string[]
    rowCount: number
}

interface QueryResult {
    columns: string[]
    data: any[]
    rowCount: number
    executionTime: number
}

interface ApiAnalysisResult {
    endpoint: string
    method: string
    status: 'success' | 'error' | 'loading'
    data?: any
    error?: string
    responseTime?: number
    timestamp: Date
}

interface Session {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    messageCount: number
    lastMessage?: string
}

interface ChatHistory {
    id: string
    sessionId: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

export default function ProjectAjax() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [aiProvider, setAiProvider] = useState<'gemini'>('gemini')
    const [aiModel, setAiModel] = useState('gemini-2.5-flash')
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    // AI Ayarları paneli
    const [showAiSettings, setShowAiSettings] = useState(false)
    const [aiSaving, setAiSaving] = useState(false)
    const [aiTesting, setAiTesting] = useState(false)
    const [aiTestMessage, setAiTestMessage] = useState<string | null>(null)
    const [aiApiKeyLocal, setAiApiKeyLocal] = useState('')
    // ElevenLabs API Key
    const [elevenLabsApiKeyLocal, setElevenLabsApiKeyLocal] = useState('')
    const [elevenLabsSaving, setElevenLabsSaving] = useState(false)
    // Dosya yükleme
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

    // Database Interface States - Removed

    // API Analysis States
    const [showApiAnalysis, setShowApiAnalysis] = useState(false)
    const [apiResults, setApiResults] = useState<ApiAnalysisResult[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Session States
    const [sessions, setSessions] = useState<Session[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [showSessions, setShowSessions] = useState(false)
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)

    // Prompt Modal States
    const [showPromptModal, setShowPromptModal] = useState(false)
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [apiData, setApiData] = useState<any>(null)
    const [enhancedPrompt, setEnhancedPrompt] = useState('')
  // Önizleme paneli
    const [showPreviewPanel, setShowPreviewPanel] = useState(true)
    const [previewBlock, setPreviewBlock] = useState<{ lang: string; code: string } | null>(null)

    // Dark Mode State
    const [darkMode, setDarkMode] = useState<boolean>(true)
    
    // Text-to-Speech States
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
    const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
    const [showVoiceSettings, setShowVoiceSettings] = useState(false)
    
    // Voice Settings (localStorage'dan yükle)
    const [voiceSettings, setVoiceSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ajax_voice_settings')
            if (saved) {
                try {
                    return JSON.parse(saved)
                } catch (e) {
                    console.error('Voice settings parse error:', e)
                }
            }
        }
        return {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            voiceName: null as string | null,
            lang: 'tr-TR'
        }
    })
    
    // ElevenLabs settings
    const [useElevenLabs, setUseElevenLabs] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ajax_use_elevenlabs') === 'true'
        }
        return false
    })
    const [elevenLabsConfig, setElevenLabsConfig] = useState<ElevenLabsConfig | null>(null)
    
    // Auto-speak setting (ses motoru ayarı)
    const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ajax_auto_speak')
            return saved === 'true'
        }
        return false
    })
    
    // ElevenLabs config'i yükle ve otomatik aktif et
    useEffect(() => {
        const loadElevenLabsConfig = async () => {
            try {
                const config = await ElevenLabsService.getConfig()
                if (config) {
                    setElevenLabsConfig(config)
                    // API key'i maskelenmiş formatta göster
                    if (config.apiKey && !config.apiKeyMasked) {
                        setElevenLabsApiKeyLocal(config.apiKey)
                    } else if (config.apiKey && config.apiKeyMasked) {
                        // Maskelenmiş key varsa boş bırak ama placeholder'da bilgi göster
                        setElevenLabsApiKeyLocal('')
                    } else {
                        setElevenLabsApiKeyLocal('')
                    }
                    
                    console.log('✅ ElevenLabs config yüklendi:', { 
                        hasApiKey: !!config.apiKey, 
                        masked: config.apiKeyMasked,
                        enabled: config.enabled
                    })
                    
                    // Eğer config enabled ve API key varsa, otomatik olarak ElevenLabs'i aktif et
                    if (config.enabled && config.apiKey) {
                        setUseElevenLabs(true)
                        if (typeof window !== 'undefined') {
                            try {
                                localStorage.setItem('ajax_use_elevenlabs', 'true')
                            } catch (error: any) {
                                console.warn('⚠️ localStorage kayıt hatası:', error)
                            }
                        }
                        console.log('✅ ElevenLabs otomatik olarak aktif edildi')
                    }
                }
            } catch (error) {
                console.error('❌ ElevenLabs config yüklenemedi:', error)
            }
        }
        loadElevenLabsConfig()
    }, [])
    
    // ElevenLabs API key kaydet
    const handleSaveElevenLabsApiKey = async () => {
        if (!elevenLabsApiKeyLocal.trim()) {
            alert('Lütfen ElevenLabs API key girin')
            return
        }

        setElevenLabsSaving(true)
        try {
            await ElevenLabsService.saveConfig({ 
                apiKey: elevenLabsApiKeyLocal.trim(),
                enabled: true
            })
            const updatedConfig = await ElevenLabsService.getConfig()
            setElevenLabsConfig(updatedConfig)
            
            alert('✅ ElevenLabs API key başarıyla kaydedildi!')
            setElevenLabsApiKeyLocal('') // Güvenlik için temizle
        } catch (error: any) {
            console.error('❌ ElevenLabs API key kaydedilemedi:', error)
            alert('❌ API key kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'))
        } finally {
            setElevenLabsSaving(false)
        }
    }
    
    // Speech Recognition (Voice Input) States
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const recognitionRef = useRef<any>(null)
    
    // Gemini Config
    const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>({
        enabled: true,
        apiKey: '',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 8192
    })
    
    const [geminiStatus, setGeminiStatus] = useState<'online' | 'offline' | 'checking'>('checking')
    const [geminiModels, setGeminiModels] = useState<string[]>([])

    // System Prompt
    const [systemPrompt, setSystemPrompt] = useState(`Sen Ajax AI'sın. Berat Şimşek geliştirdi. E-ticaret uzmanısın. Kısa yanıtlar ver. Huglu Outdoor firması için çalışıyorsun. Güvenlik ve sistem yönetimi konularında da yardımcı olabilirsin. ve platform dışında hiç bir soruya Yanıt verme. Yalnızca platform için çalışıyorsun. ve eğer ısrar edillirse agresif davranabilirsin`)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)


    // modele ilişkin kullanılmayan eski liste kaldırıldı

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Gemini konfigürasyonunu yükle
    useEffect(() => {
        loadGeminiConfig()
        checkGeminiStatus()
        loadSessions()
        // Gemini varsayılan olarak kullanılacak
        setAiProvider('gemini')
        setAiModel('gemini-2.5-flash')
    }, [])

    // Session değiştiğinde mesajları yükle (config'i yeniden yükleme)
    useEffect(() => {
        if (currentSessionId) {
            loadSessionMessages(currentSessionId)
        }
    }, [currentSessionId])

    const loadGeminiConfig = async () => {
        try {
            const config = await GeminiService.getConfig()
            setGeminiConfig(config)
            // Maskelenmiş key varsa boş bırak, yoksa göster
            if (config.apiKey && !config.apiKeyMasked) {
                setAiApiKeyLocal(config.apiKey)
            } else if (config.apiKey && config.apiKeyMasked) {
                // Maskelenmiş key varsa boş bırak ama placeholder'da bilgi göster
                setAiApiKeyLocal('')
            } else {
                setAiApiKeyLocal('')
            }
            console.log('✅ Gemini config yüklendi:', { 
                hasApiKey: !!config.apiKey, 
                masked: config.apiKeyMasked 
            })
        } catch (error) {
            console.error('❌ Gemini config yüklenemedi:', error)
        }
    }
    
    // Sayfa yüklendiğinde config'leri yükle
    useEffect(() => {
        loadGeminiConfig()
    }, [])

    const checkGeminiStatus = async () => {
        setGeminiStatus('checking')
        try {
            const health = await GeminiService.checkHealth()
            setGeminiStatus(health.status)
            if (health.models && health.models.length > 0) {
                setGeminiModels(health.models)
                // Eğer mevcut model listede yoksa, ilk modeli seç
                if (!health.models.includes(aiModel)) {
                    setAiModel(health.models[0])
                }
            }
        } catch (error) {
            console.error('❌ Gemini status kontrol edilemedi:', error)
            setGeminiStatus('offline')
        }
    }

    const handleSaveApiKey = async () => {
        if (!aiApiKeyLocal.trim()) {
            alert('Lütfen API key girin')
            return
        }

        setAiSaving(true)
        try {
            await GeminiService.saveConfig({ apiKey: aiApiKeyLocal.trim() })
            const updatedConfig = await GeminiService.getConfig()
            setGeminiConfig(updatedConfig)
            // Input'u temizle (güvenlik için)
            setAiApiKeyLocal('')
            
            // Durumu kontrol et
            await checkGeminiStatus()
            
            alert('✅ API key başarıyla kaydedildi!')
        } catch (error: any) {
            console.error('❌ API key kaydedilemedi:', error)
            
            // QuotaExceededError için özel mesaj
            if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
                const shouldClear = confirm(
                    '⚠️ Tarayıcı depolama alanı dolu. Eski verileri temizlemek ister misiniz?\n\n' +
                    'Bu işlem sadece Gemini ile ilgili eski verileri temizleyecektir.'
                )
                
                if (shouldClear) {
                    try {
                        // localStorage'daki gemini ile ilgili eski verileri temizle
                        const keysToRemove: string[] = []
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i)
                            if (key && (key.startsWith('gemini_') || key.includes('chat') || key.includes('message'))) {
                                keysToRemove.push(key)
                            }
                        }
                        
                        keysToRemove.forEach(key => {
                            try {
                                localStorage.removeItem(key)
                            } catch (e) {
                                // Devam et
                            }
                        })
                        
                        // Tekrar kaydetmeyi dene
                        await GeminiService.saveConfig({ apiKey: aiApiKeyLocal.trim() })
                        const updatedConfig = await GeminiService.getConfig()
                        setGeminiConfig(updatedConfig)
                        await checkGeminiStatus()
                        
                        alert('✅ API key başarıyla kaydedildi! (Eski veriler temizlendi)')
                    } catch (retryError) {
                        console.error('❌ Temizleme sonrası kaydedilemedi:', retryError)
                        alert('❌ API key kaydedilemedi. Lütfen tarayıcı ayarlarından depolama alanını temizleyin.')
                    }
                }
            } else {
                alert(`❌ API key kaydedilemedi: ${error?.message || 'Bilinmeyen hata'}`)
            }
        } finally {
            setAiSaving(false)
        }
    }

    // Session Management Functions
    const loadSessions = async () => {
        setIsLoadingSessions(true)
        try {
            const response = await fetch('https://api.huglutekstil.com/api/chat/sessions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                const data = await response.json()
                setSessions(data.sessions || [])
                
                // Eğer hiç session yoksa yeni bir tane oluştur
                if (data.sessions.length === 0) {
                    await createNewSession()
                } else {
                    // İlk session'ı seç
                    setCurrentSessionId(data.sessions[0].id)
                }
            }
        } catch (error) {
            console.error('❌ Sessionlar yüklenemedi:', error)
            // Hata durumunda yeni session oluştur
            await createNewSession()
        } finally {
            setIsLoadingSessions(false)
        }
    }

    const createNewSession = async () => {
        try {
            const sessionName = `Sohbet ${new Date().toLocaleDateString('tr-TR')}`
            const response = await fetch('https://api.huglutekstil.com/api/chat/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                },
                body: JSON.stringify({
                    name: sessionName,
                    messages: []
                })
            })
            
            if (response.ok) {
                const data = await response.json()
                const newSession: Session = {
                    id: data.sessionId,
                    name: sessionName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    messageCount: 0
                }
                
                setSessions(prev => [newSession, ...prev])
                setCurrentSessionId(data.sessionId)
                
                // Yeni session için boş mesaj listesi
                setMessages([{
                    id: '1',
                    role: 'assistant',
                    content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
                    timestamp: new Date()
                }])
            }
        } catch (error) {
            console.error('❌ Yeni session oluşturulamadı:', error)
        }
    }

    const loadSessionMessages = async (sessionId: string) => {
        try {
            const response = await fetch(`https://api.huglutekstil.com/api/chat/sessions/${sessionId}/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                const data = await response.json()
                // Timestamp'leri Date objesine çevir
                const messages = (data.messages || []).map((msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp || Date.now())
                }))
                setMessages(messages)
            }
        } catch (error) {
            console.error('❌ Session mesajları yüklenemedi:', error)
        }
    }

    const saveSessionMessages = async (sessionId: string, messages: Message[]) => {
        try {
            await fetch(`https://api.huglutekstil.com/api/chat/sessions/${sessionId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                },
                body: JSON.stringify({ messages })
            })
        } catch (error) {
            console.error('❌ Mesajlar kaydedilemedi:', error)
        }
    }

    const deleteSession = async (sessionId: string) => {
        // Onay mesajı
        const sessionName = sessions.find(s => s.id === sessionId)?.name || 'Bu sohbet'
        if (!confirm(`${sessionName} sohbetini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            return
        }

        try {
            // Önce GeminiService üzerinden sil (eğer backend'de kayıtlıysa)
            try {
                await GeminiService.deleteSession(sessionId)
            } catch (geminiError) {
                console.warn('⚠️ GeminiService üzerinden silinemedi, direkt API deneniyor:', geminiError)
            }

            // Backend API'den de sil
            const response = await fetch(`https://api.huglutekstil.com/api/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                // Session listesinden kaldır
                setSessions(prev => prev.filter(s => s.id !== sessionId))
                
                // Eğer silinen session aktif session ise
                if (currentSessionId === sessionId) {
                    const remainingSessions = sessions.filter(s => s.id !== sessionId)
                    
                    // Mesajları temizle
                    setMessages([{
                        id: '1',
                        role: 'assistant',
                        content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
                        timestamp: new Date()
                    }])
                    
                    // Başka session varsa onu seç, yoksa yeni oluştur
                    if (remainingSessions.length > 0) {
                        setCurrentSessionId(remainingSessions[0].id)
                        await loadSessionMessages(remainingSessions[0].id)
                    } else {
                        setCurrentSessionId(null)
                        await createNewSession()
                    }
                }
                
                alert('✅ Sohbet başarıyla silindi')
            } else {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Sohbet silinemedi')
            }
        } catch (error: any) {
            console.error('❌ Session silinemedi:', error)
            alert(`❌ Sohbet silinemedi: ${error.message || 'Bilinmeyen hata'}`)
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        const currentInput = input
        setInput('')
        setIsTyping(true)

        // Mesajları otomatik kaydet
        if (currentSessionId) {
            const updatedMessages = [...messages, userMessage]
            saveSessionMessages(currentSessionId, updatedMessages)
        }

        try {
            // Gemini kullanılıyor
            await sendToGemini(currentInput, aiModel)
        } catch (error) {
            console.error('❌ Mesaj gönderilemedi:', error)
            
            // Hata tipine göre farklı mesajlar
            let errorContent = `❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
            
            if (error instanceof Error) {
                if (error.message.includes('API key')) {
                    errorContent = `❌ API Key Hatası: Gemini API key'i eksik veya geçersiz. Lütfen ayarlardan API key'inizi girin.`
                } else if (error.message.includes('Model bulunamadı')) {
                    errorContent = `❌ Model Hatası: Model bulunamadı. Lütfen model adını kontrol edin.`
                } else if (error.message.includes('Sunucu hatası')) {
                    errorContent = `❌ Sunucu Hatası: Gemini sunucusunda bir sorun var. Lütfen daha sonra tekrar deneyin.`
                } else if (error.message.includes('Geçersiz istek')) {
                    errorContent = `❌ İstek Hatası: Gönderilen veri geçersiz. Lütfen mesajınızı kontrol edin.`
                }
            }
            
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const sendToGemini = async (userInput: string, modelName: string) => {
        try {
                // API entegrasyonu tekrar aktif - optimizasyonlarla
                let enhancedPrompt = systemPrompt
                const lowerInput = userInput.toLowerCase()
                let fetchedApiData: any = null
                
                // Satış/Trend anahtar kelimeleri
                if (lowerInput.includes('satış') || lowerInput.includes('trend') || lowerInput.includes('analiz')) {
                    try {
                        const salesData = await fetch('https://api.huglutekstil.com/api/admin/orders', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (salesData.ok) {
                            const data = await salesData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                totalAmount: item.totalAmount,
                                status: item.status,
                                createdAt: item.createdAt
                            })) : limitedData
                            enhancedPrompt += `\n\nSATIŞ VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'sales', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Satış verisi alınamadı:', error)
                    }
                }
                
                // Ürün anahtar kelimeleri
                if (lowerInput.includes('ürün') || lowerInput.includes('product') || lowerInput.includes('stok')) {
                    try {
                        const productData = await fetch('https://api.huglutekstil.com/api/products', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (productData.ok) {
                            const data = await productData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                stock: item.stock,
                                category: item.category
                            })) : limitedData
                            enhancedPrompt += `\n\nÜRÜN VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'products', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Ürün verisi alınamadı:', error)
                    }
                }
                
                // Müşteri anahtar kelimeleri
                if (lowerInput.includes('müşteri') || lowerInput.includes('customer') || lowerInput.includes('segment')) {
                    try {
                        const customerData = await fetch('https://api.huglutekstil.com/api/admin/users', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (customerData.ok) {
                            const data = await customerData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                name: item.name,
                                email: item.email,
                                createdAt: item.createdAt
                            })) : limitedData
                            enhancedPrompt += `\n\nMÜŞTERİ VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'customers', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Müşteri verisi alınamadı:', error)
                    }
                }
                
                // Kategori anahtar kelimeleri
                if (lowerInput.includes('kategori') || lowerInput.includes('category') || lowerInput.includes('kamp')) {
                    try {
                        const categoryData = await fetch('https://api.huglutekstil.com/api/categories', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (categoryData.ok) {
                            const data = await categoryData.json()
                            // Veriyi sınırla - sadece ilk 3 kayıt
                            const limitedData = Array.isArray(data) ? data.slice(0, 3) : data
                            enhancedPrompt += `\n\nKATEGORİ VERİLERİ:\n${JSON.stringify(limitedData)}`
                            fetchedApiData = { type: 'categories', data: limitedData }
                        }
                    } catch (error) {
                        console.log('Kategori verisi alınamadı:', error)
                    }
                }
                
                // Stok anahtar kelimeleri
                if (lowerInput.includes('stok') || lowerInput.includes('stock') || lowerInput.includes('düşük')) {
                    try {
                        const stockData = await fetch('https://api.huglutekstil.com/api/products/low-stock', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (stockData.ok) {
                            const data = await stockData.json()
                            // Veriyi sınırla - sadece ilk 3 kayıt
                            const limitedData = Array.isArray(data) ? data.slice(0, 3) : data
                            enhancedPrompt += `\n\nSTOK VERİLERİ:\n${JSON.stringify(limitedData)}`
                        }
                    } catch (error) {
                        console.log('Stok verisi alınamadı:', error)
                    }
                }
                
                // Ticimax sipariş anahtar kelimeleri
                if (lowerInput.includes('ticimax') || lowerInput.includes('ticimax sipariş')) {
                    try {
                        const ticimaxData = await fetch('https://api.huglutekstil.com/api/admin/ticimax-orders?sortOrder=desc', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            credentials: 'include',
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (ticimaxData.ok) {
                            const data = await ticimaxData.json()
                            if (data.success && data.data) {
                                // Veriyi sınırla - sadece ilk 5 kayıt ve önemli alanlar
                                const limitedData = Array.isArray(data.data) ? data.data.slice(0, 5).map((order: any) => ({
                                    id: order.id,
                                    externalOrderId: order.externalOrderId,
                                    orderNumber: order.orderNumber,
                                    totalAmount: order.totalAmount,
                                    status: order.status,
                                    customerName: order.customerName,
                                    customerEmail: order.customerEmail,
                                    city: order.city,
                                    district: order.district,
                                    orderDate: order.orderDate,
                                    createdAt: order.createdAt,
                                    itemsCount: order.items?.length || 0
                                })) : data.data
                                enhancedPrompt += `\n\nTICIMAX SİPARİŞ VERİLERİ:\n${JSON.stringify(limitedData)}`
                                if (data.total !== undefined) {
                                    enhancedPrompt += `\nToplam Ticimax Sipariş Sayısı: ${data.total}`
                                }
                                if (data.totalAmount !== undefined) {
                                    enhancedPrompt += `\nToplam Ticimax Tutar: ${data.totalAmount} TL`
                                }
                                fetchedApiData = { type: 'ticimax-orders', data: limitedData }
                            }
                        }
                    } catch (error) {
                        console.log('Ticimax sipariş verisi alınamadı:', error)
                    }
                }
                
                // Trendyol sipariş anahtar kelimeleri
                if (lowerInput.includes('trendyol') || lowerInput.includes('trendyol sipariş')) {
                    try {
                        const trendyolData = await fetch('https://api.huglutekstil.com/api/admin/marketplace-orders?provider=trendyol', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            credentials: 'include',
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (trendyolData.ok) {
                            const data = await trendyolData.json()
                            if (data.success && data.data) {
                                // Veriyi sınırla - sadece ilk 5 kayıt ve önemli alanlar
                                const limitedData = Array.isArray(data.data) ? data.data.slice(0, 5).map((order: any) => ({
                                    id: order.id,
                                    externalOrderId: order.externalOrderId,
                                    totalAmount: order.totalAmount,
                                    status: order.status,
                                    customerName: order.customerName,
                                    customerEmail: order.customerEmail,
                                    city: order.city,
                                    district: order.district,
                                    syncedAt: order.syncedAt,
                                    createdAt: order.createdAt,
                                    itemsCount: order.items?.length || 0
                                })) : data.data
                                enhancedPrompt += `\n\nTRENDYOL SİPARİŞ VERİLERİ:\n${JSON.stringify(limitedData)}`
                                if (data.total !== undefined) {
                                    enhancedPrompt += `\nToplam Trendyol Sipariş Sayısı: ${data.total}`
                                }
                                if (data.totalAmount !== undefined) {
                                    enhancedPrompt += `\nToplam Trendyol Tutar: ${data.totalAmount} TL`
                                }
                                fetchedApiData = { type: 'trendyol-orders', data: limitedData }
                            }
                        }
                    } catch (error) {
                        console.log('Trendyol sipariş verisi alınamadı:', error)
                    }
                }
                
                // Hepsiburada sipariş anahtar kelimeleri
                if (lowerInput.includes('hepsiburada') || lowerInput.includes('hepsiburada sipariş') || lowerInput.includes('hepsi burada')) {
                    try {
                        const hepsiburadaData = await fetch('https://api.huglutekstil.com/api/admin/hepsiburada-orders', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            credentials: 'include',
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (hepsiburadaData.ok) {
                            const data = await hepsiburadaData.json()
                            if (data.success && data.data) {
                                // Veriyi sınırla - sadece ilk 5 kayıt ve önemli alanlar
                                const limitedData = Array.isArray(data.data) ? data.data.slice(0, 5).map((order: any) => ({
                                    id: order.id,
                                    externalOrderId: order.externalOrderId,
                                    totalAmount: order.totalAmount,
                                    status: order.status,
                                    customerName: order.customerName,
                                    customerEmail: order.customerEmail,
                                    city: order.city,
                                    district: order.district,
                                    syncedAt: order.syncedAt,
                                    createdAt: order.createdAt,
                                    itemsCount: order.items?.length || 0
                                })) : data.data
                                enhancedPrompt += `\n\nHEPSİBURADA SİPARİŞ VERİLERİ:\n${JSON.stringify(limitedData)}`
                                if (data.total !== undefined) {
                                    enhancedPrompt += `\nToplam Hepsiburada Sipariş Sayısı: ${data.total}`
                                }
                                if (data.totalAmount !== undefined) {
                                    enhancedPrompt += `\nToplam Hepsiburada Tutar: ${data.totalAmount} TL`
                                }
                                fetchedApiData = { type: 'hepsiburada-orders', data: limitedData }
                            }
                        }
                    } catch (error) {
                        console.log('Hepsiburada sipariş verisi alınamadı:', error)
                    }
                }
                
                // Tüm marketplace siparişleri (ticimax + trendyol + hepsiburada)
                if (lowerInput.includes('marketplace') || lowerInput.includes('pazaryeri') || 
                    (lowerInput.includes('sipariş') && (lowerInput.includes('tüm') || lowerInput.includes('hepsi')))) {
                    try {
                        // Tüm marketplace'leri paralel olarak çek
                        const [ticimaxRes, trendyolRes, hepsiburadaRes] = await Promise.all([
                            fetch('https://api.huglutekstil.com/api/admin/ticimax-orders?sortOrder=desc', {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                },
                                credentials: 'include',
                                signal: AbortSignal.timeout(10000)
                            }),
                            fetch('https://api.huglutekstil.com/api/admin/marketplace-orders?provider=trendyol', {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                },
                                credentials: 'include',
                                signal: AbortSignal.timeout(10000)
                            }),
                            fetch('https://api.huglutekstil.com/api/admin/hepsiburada-orders', {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                },
                                credentials: 'include',
                                signal: AbortSignal.timeout(10000)
                            })
                        ])
                        
                        const marketplaceData: any = {}
                        
                        if (ticimaxRes.ok) {
                            const ticimaxData = await ticimaxRes.json()
                            if (ticimaxData.success && ticimaxData.data) {
                                marketplaceData.ticimax = {
                                    orders: Array.isArray(ticimaxData.data) ? ticimaxData.data.slice(0, 3).map((o: any) => ({
                                        id: o.id,
                                        externalOrderId: o.externalOrderId,
                                        totalAmount: o.totalAmount,
                                        status: o.status
                                    })) : ticimaxData.data,
                                    total: ticimaxData.total || 0,
                                    totalAmount: ticimaxData.totalAmount || 0
                                }
                            }
                        }
                        
                        if (trendyolRes.ok) {
                            const trendyolData = await trendyolRes.json()
                            if (trendyolData.success && trendyolData.data) {
                                marketplaceData.trendyol = {
                                    orders: Array.isArray(trendyolData.data) ? trendyolData.data.slice(0, 3).map((o: any) => ({
                                        id: o.id,
                                        externalOrderId: o.externalOrderId,
                                        totalAmount: o.totalAmount,
                                        status: o.status
                                    })) : trendyolData.data,
                                    total: trendyolData.total || 0,
                                    totalAmount: trendyolData.totalAmount || 0
                                }
                            }
                        }
                        
                        if (hepsiburadaRes.ok) {
                            const hepsiburadaData = await hepsiburadaRes.json()
                            if (hepsiburadaData.success && hepsiburadaData.data) {
                                marketplaceData.hepsiburada = {
                                    orders: Array.isArray(hepsiburadaData.data) ? hepsiburadaData.data.slice(0, 3).map((o: any) => ({
                                        id: o.id,
                                        externalOrderId: o.externalOrderId,
                                        totalAmount: o.totalAmount,
                                        status: o.status
                                    })) : hepsiburadaData.data,
                                    total: hepsiburadaData.total || 0,
                                    totalAmount: hepsiburadaData.totalAmount || 0
                                }
                            }
                        }
                        
                        if (Object.keys(marketplaceData).length > 0) {
                            enhancedPrompt += `\n\nTÜM MARKETPLACE SİPARİŞ VERİLERİ:\n${JSON.stringify(marketplaceData)}`
                            fetchedApiData = { type: 'all-marketplace-orders', data: marketplaceData }
                        }
                    } catch (error) {
                        console.log('Marketplace sipariş verileri alınamadı:', error)
                    }
                }

                // Snort Logları - Güvenlik anahtar kelimeleri
                if (lowerInput.includes('snort') || lowerInput.includes('güvenlik') || lowerInput.includes('log') || 
                    lowerInput.includes('saldırı') || lowerInput.includes('threat') || lowerInput.includes('attack') ||
                    lowerInput.includes('ids') || lowerInput.includes('security') ||
                    lowerInput.includes('uyarı') || lowerInput.includes('alert') || lowerInput.includes('engellenen')) {
                    try {
                        // Veritabanından Snort loglarını getir (useDatabase=true varsayılan)
                        const snortResponse = await api.get<any>('/admin/snort/logs', { 
                            limit: 20,
                            useDatabase: 'true',
                            _t: Date.now()
                        })
                        
                        if (snortResponse && Array.isArray(snortResponse.data)) {
                            const logs = snortResponse.data
                            
                            // Logları formatla - sadece önemli bilgiler
                            const formattedLogs = logs.slice(0, 10).map((log: any) => ({
                                timestamp: log.timestamp || log.time || log.date,
                                priority: log.priority || 'unknown',
                                classification: log.classification || log.message || 'N/A',
                                sourceIP: log.src_ip || log.sourceIP || log.ip || 'N/A',
                                destinationIP: log.dst_ip || log.destIP || 'N/A',
                                action: log.action || 'N/A',
                                protocol: log.protocol || 'N/A'
                            }))
                            
                            // İstatistikleri hesapla
                            const stats = {
                                total: logs.length,
                                high: logs.filter((l: any) => (l.priority || '').toLowerCase() === 'high').length,
                                medium: logs.filter((l: any) => (l.priority || '').toLowerCase() === 'medium').length,
                                low: logs.filter((l: any) => (l.priority || '').toLowerCase() === 'low').length,
                                alerts: logs.filter((l: any) => (l.action || '').toLowerCase() === 'alert').length,
                                dropped: logs.filter((l: any) => (l.action || '').toLowerCase() === 'drop').length
                            }
                            
                            enhancedPrompt += `\n\nSNORT IDS GÜVENLİK LOGLARI:\n`
                            enhancedPrompt += `Toplam Log: ${stats.total}\n`
                            enhancedPrompt += `Yüksek Öncelik: ${stats.high}\n`
                            enhancedPrompt += `Orta Öncelik: ${stats.medium}\n`
                            enhancedPrompt += `Düşük Öncelik: ${stats.low}\n`
                            enhancedPrompt += `Uyarılar: ${stats.alerts}\n`
                            enhancedPrompt += `Engellenen: ${stats.dropped}\n\n`
                            enhancedPrompt += `SON 10 LOG KAYDI:\n${JSON.stringify(formattedLogs, null, 2)}`
                            
                            fetchedApiData = { type: 'snort-logs', data: { logs: formattedLogs, stats } }
                        }
                    } catch (error) {
                        console.log('Snort logları alınamadı:', error)
                        // Hata durumunda bile bilgi ver
                        enhancedPrompt += `\n\nNOT: Snort IDS loglarına şu anda erişilemiyor. Lütfen sistem yöneticisine başvurun.`
                    }
                }

            // Mesaj geçmişini hazırla - Gemini formatı
            const geminiMessages: GeminiMessage[] = []

            // System prompt'u ilk user mesajına ekle (Gemini system mesajı desteklemez)
            const firstUserMessage = enhancedPrompt + (enhancedPrompt ? '\n\n' : '') + userInput

            // Son 2 mesajı al (sınırlamaya takılmamak için)
            const recentMessages = messages.slice(-2)
            
            // Mesaj geçmişini ekle
            recentMessages.forEach(msg => {
                if (msg.content && msg.content.trim()) {
                    geminiMessages.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        content: msg.content
                    })
                }
            })

            // Kullanıcının yeni mesajını ekle (system prompt ile birleştirilmiş)
            geminiMessages.push({ role: 'user', content: firstUserMessage })

            // Enhanced prompt'u sınırla (maksimum 2000 karakter)
            if (enhancedPrompt.length > 2000) {
                enhancedPrompt = enhancedPrompt.substring(0, 2000) + '...\n[Veri kısaltıldı]'
            }

            // Prompt modal'ı tetikle
            setCurrentPrompt(systemPrompt)
            setApiData(fetchedApiData)
            setEnhancedPrompt(enhancedPrompt)
            setShowPromptModal(true)

            // Model adını debug et
            console.log('🔍 Gönderilen model adı:', modelName)
            console.log('🔍 Gemini mesajları:', geminiMessages)
            
            // API key kontrolü - config'den kontrol et (maskelenmiş olsa bile backend'den çekilecek)
            if (!geminiConfig.enabled || (!geminiConfig.apiKey && !geminiConfig.apiKeyMasked)) {
                alert('⚠️ Gemini API key yapılandırılmamış. Lütfen AI Ayarları\'ndan API key\'inizi girin.')
                setIsTyping(false)
                return
            }
            
            // Gemini'ye gönder (dosyalarla birlikte)
            const response = await GeminiService.sendMessage(geminiMessages, {
                model: modelName,
                temperature: 0.8,
                maxTokens: 4096,
                files: uploadedFiles.length > 0 ? uploadedFiles : undefined
            })

            // Yanıt yapısını kontrol et ve uygun şekilde parse et
            let content = '';
            if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = response.candidates[0].content.parts[0].text;
            } else if ((response as any).text) {
                content = (response as any).text;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                content = JSON.stringify(response);
            }

            // Streaming animasyonu başlat
            setIsStreaming(true)
            setStreamingContent('')
            
            // Geçici mesaj ekle
            const tempMessageId = (Date.now() + 1).toString()
            const tempMessage: Message = {
                id: tempMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, tempMessage])
            setIsTyping(false)

            // Yazıyormuş gibi animasyon
            simulateTyping(content, (partialContent) => {
                setStreamingContent(partialContent)
                setMessages(prev => prev.map(msg => 
                    msg.id === tempMessageId 
                        ? { ...msg, content: partialContent }
                        : msg
                ))
            })

            // Animasyon tamamlandığında streaming'i durdur
            setTimeout(() => {
                setIsStreaming(false)
                setStreamingContent('')
                
                // AI yanıtını da kaydet
                if (currentSessionId) {
                    const updatedMessages = [...messages, {
                        id: Date.now().toString(),
                        role: 'user' as const,
                        content: userInput,
                        timestamp: new Date()
                    }, {
                        id: tempMessageId,
                        role: 'assistant' as const,
                        content: content,
                        timestamp: new Date()
                    }]
                    saveSessionMessages(currentSessionId, updatedMessages)
                }
                
                // Yüklenen dosyaları temizle
                setUploadedFiles([])
                
                // Otomatik seslendirme (ses motoru ayarı açıksa)
                if (autoSpeakEnabled && content && content.trim()) {
                    // Kısa bir gecikme sonra seslendir (animasyon tamamlansın)
                    setTimeout(() => {
                        speakMessage(content, tempMessageId)
                    }, 300)
                }
            }, content.length * 30 + 500)
        } catch (error) {
            console.error('❌ Gemini yanıtı alınamadı:', error)
            
            // Hata mesajını kullanıcı dostu hale getir
            let errorMessage = 'Gemini servisi şu anda kullanılamıyor.';
            if (error instanceof Error) {
                if (error.message.includes('API key')) {
                    errorMessage = 'Gemini API key eksik veya geçersiz. Lütfen ayarlardan API key\'inizi girin.';
                } else if (error.message.includes('kullanılamıyor')) {
                    errorMessage = error.message;
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
                } else {
                    errorMessage = `Hata: ${error.message}`;
                }
            }
            
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ ${errorMessage}\n\nLütfen daha sonra tekrar deneyin.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsTyping(false)
            
            // Hata mesajlarını seslendirme (opsiyonel - şimdilik kapalı)
            // if (autoSpeakEnabled) {
            //     setTimeout(() => {
            //         speakMessage(errorMsg.content, errorMsg.id)
            //     }, 300)
            // }
        }
    }

    // Auto-speak ayarını toggle et
    const toggleAutoSpeak = () => {
        const newValue = !autoSpeakEnabled
        setAutoSpeakEnabled(newValue)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('ajax_auto_speak', String(newValue))
            } catch (error: any) {
                console.warn('⚠️ localStorage kayıt hatası (auto_speak):', error)
            }
        }
    }
    
    // ElevenLabs kullanımını toggle et
    const toggleElevenLabs = async () => {
        const newValue = !useElevenLabs
        setUseElevenLabs(newValue)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('ajax_use_elevenlabs', String(newValue))
            } catch (error: any) {
                console.warn('⚠️ localStorage kayıt hatası (use_elevenlabs):', error)
            }
        }
        
        if (newValue) {
            const config = await ElevenLabsService.getConfig()
            setElevenLabsConfig(config)
        }
    }

    // Database functions removed

    // Database functions removed

    // Database functions removed

    // Database functions removed

    // API analiz fonksiyonları
    const analyzeApiEndpoint = async (endpoint: string, method: string = 'GET', data?: any): Promise<ApiAnalysisResult> => {
        const startTime = Date.now()
        const result: ApiAnalysisResult = {
            endpoint,
            method,
            status: 'loading',
            timestamp: new Date()
        }

        try {
            let response: any
            const fullUrl = `https://api.huglutekstil.com/api${endpoint}`
            
            const headers = {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
            }

            if (method === 'GET') {
                response = await fetch(fullUrl, { 
                    method: 'GET', 
                    headers,
                    signal: AbortSignal.timeout(10000)
                })
            } else if (method === 'POST') {
                response = await fetch(fullUrl, { 
                    method: 'POST', 
                    headers,
                    body: JSON.stringify(data || {}),
                    signal: AbortSignal.timeout(10000)
                })
            }

            const responseTime = Date.now() - startTime
            const responseData = await response.json()

            if (response.ok) {
                result.status = 'success'
                result.data = responseData
                result.responseTime = responseTime
            } else {
                result.status = 'error'
                result.error = `HTTP ${response.status}: ${responseData.message || 'Unknown error'}`
                result.responseTime = responseTime
            }
        } catch (error) {
            const responseTime = Date.now() - startTime
            result.status = 'error'
            result.error = error instanceof Error ? error.message : 'Unknown error'
            result.responseTime = responseTime
        }

        return result
    }

    // Tüm API endpointlerini test et
    const testAllApiEndpoints = async () => {
        setIsAnalyzing(true)
        setApiResults([])

        const endpoints = [
            { endpoint: '/admin/orders', method: 'GET' },
            { endpoint: '/admin/users', method: 'GET' },
            { endpoint: '/admin/categories', method: 'GET' },
            { endpoint: '/admin/category-stats', method: 'GET' },
            { endpoint: '/products', method: 'GET' },
            { endpoint: '/categories', method: 'GET' },
            { endpoint: '/analytics/monthly', method: 'GET' },
            { endpoint: '/products/low-stock', method: 'GET' },
            { endpoint: '/admin/visitor-ips', method: 'GET' },
            { endpoint: '/admin/live-views', method: 'GET' },
            { endpoint: '/admin/snort/logs', method: 'GET' },
            { endpoint: '/admin/custom-production-requests', method: 'GET' }
        ]

        const results: ApiAnalysisResult[] = []

        for (const endpoint of endpoints) {
            const result = await analyzeApiEndpoint(endpoint.endpoint, endpoint.method)
            results.push(result)
            setApiResults([...results]) // Her sonuç için güncelle
        }

        setIsAnalyzing(false)
    }

    // API performans analizi
    const analyzeApiPerformance = async () => {
        setIsAnalyzing(true)
        setApiResults([])

        const performanceEndpoints = [
            { endpoint: '/admin/orders', method: 'GET', name: 'Siparişler' },
            { endpoint: '/products', method: 'GET', name: 'Ürünler' },
            { endpoint: '/categories', method: 'GET', name: 'Kategoriler' },
            { endpoint: '/analytics/monthly', method: 'GET', name: 'Analitik' }
        ]

        const results: ApiAnalysisResult[] = []

        // Her endpoint'i 3 kez test et
        for (const endpoint of performanceEndpoints) {
            const testResults: number[] = []
            
            for (let i = 0; i < 3; i++) {
                const result = await analyzeApiEndpoint(endpoint.endpoint, endpoint.method)
                if (result.responseTime) {
                    testResults.push(result.responseTime)
                }
            }

            const avgResponseTime = testResults.reduce((a, b) => a + b, 0) / testResults.length
            const minResponseTime = Math.min(...testResults)
            const maxResponseTime = Math.max(...testResults)

            results.push({
                endpoint: `${endpoint.name} (${endpoint.endpoint})`,
                method: endpoint.method,
                status: 'success',
                data: {
                    averageResponseTime: Math.round(avgResponseTime),
                    minResponseTime,
                    maxResponseTime,
                    tests: testResults.length
                },
                responseTime: avgResponseTime,
                timestamp: new Date()
            })

            setApiResults([...results])
        }

        setIsAnalyzing(false)
    }

    const generateAIResponse = async (userInput: string): Promise<string> => {
        const lowerInput = userInput.toLowerCase()

        // Kimlik sorguları
        if (lowerInput.includes('kimsin') || lowerInput.includes('kim') || lowerInput.includes('adın') || lowerInput.includes('ismin') || lowerInput.includes('sen kim')) {
            return `🤖 **Ajax AI**\n\nMerhaba! Ben Ajax AI'yım - gelişmiş bir yapay zeka asistanıyım.\n\n**Geliştirici:** Berat Şimşek\n**Uzmanlık Alanım:** E-ticaret, iş analizi, veri analizi\n**Amacım:** İşletmelerin daha iyi kararlar almasına yardımcı olmak\n\nSize nasıl yardımcı olabilirim?`
        }

        if (lowerInput.includes('geliştirici') || lowerInput.includes('yapan') || lowerInput.includes('kodlayan') || lowerInput.includes('programcı')) {
            return `👨‍💻 **Geliştirici Bilgisi**\n\nAjax AI'yı **Berat Şimşek** geliştirdi.\n\nBerat Şimşek, yapay zeka ve e-ticaret alanlarında uzman bir yazılım geliştiricisidir. Ajax AI'yı işletmelerin daha verimli çalışması için tasarlamıştır.\n\nBaşka bir konuda yardıma ihtiyacınız var mı?`
        }

        if (lowerInput.includes('satış') || lowerInput.includes('trend')) {
            return `📊 **Satış Trend Analizi**\n\nSon 30 günlük verilerinizi analiz ettim:\n\n• Toplam Satış: ₺328,450 (+12.5%)\n• En Çok Satan Kategori: Elektronik (%45)\n• Büyüme Trendi: Pozitif yönde\n• Öneriler:\n  - iPhone 15 Pro stoklarını artırın\n  - Hafta sonu kampanyaları etkili\n  - Mobil satışlar artış gösteriyor\n\nDetaylı rapor için "rapor oluştur" yazabilirsiniz.`
        }

        if (lowerInput.includes('müşteri') || lowerInput.includes('segment')) {
            return `👥 **Müşteri Segmentasyonu**\n\nMüşterilerinizi 4 ana segmente ayırdım:\n\n1. **Premium Segment** (%23)\n   - Ortalama sepet: ₺5,200\n   - Sadakat: Yüksek\n\n2. **Düzenli Alıcılar** (%45)\n   - Ortalama sepet: ₺2,100\n   - Aylık alışveriş: 2-3 kez\n\n3. **Fırsat Avcıları** (%22)\n   - Kampanyalara duyarlı\n   - İndirim dönemlerinde aktif\n\n4. **Yeni Müşteriler** (%10)\n   - İlk alışveriş deneyimi\n   - Potansiyel yüksek\n\nHer segment için özel stratejiler önerebilirim.`
        }

        if (lowerInput.includes('ürün') || lowerInput.includes('product') || lowerInput.includes('öner')) {
            return `🛍️ **Ürün Önerileri**\n\nSize özel ürün önerileri sunuyorum:\n\n**🔥 Trend Ürünler:**\n• iPhone 15 Pro Max - En çok aranan\n• Samsung Galaxy S24 Ultra - Yüksek performans\n• MacBook Pro M3 - Profesyonel kullanım\n• AirPods Pro 2 - Ses kalitesi\n\n**🏕️ Kamp & Outdoor:**\n• Coleman Çadır 4 Kişilik - Dayanıklı\n• Therm-a-Rest Uyku Matı - Konforlu\n• Petzl Kafa Lambası - Güvenli\n• Stanley Termos - Sıcak İçecek\n\n**💻 Teknoloji:**\n• iPad Air 5 - Çok amaçlı\n• Apple Watch Series 9 - Sağlık takibi\n• Sony WH-1000XM5 - Gürültü önleme\n• Logitech MX Master 3S - Verimlilik\n\n**🏠 Ev & Yaşam:**\n• Dyson V15 - Temizlik\n• Philips Hue Starter Kit - Akıllı aydınlatma\n• Instant Pot - Mutfak asistanı\n• Nest Hub - Ev otomasyonu\n\nHangi kategoride detay istiyorsunuz?`
        }

        if (lowerInput.includes('rapor')) {
            return `📄 **Rapor Oluşturma**\n\nHangi türde rapor istersiniz?\n\n• Satış Performans Raporu\n• Müşteri Analiz Raporu\n• Ürün Performans Raporu\n• Finansal Özet Raporu\n• Stok Durum Raporu\n\nRapor türünü belirtin, sizin için detaylı bir analiz hazırlayayım.`
        }

        if (lowerInput.includes('sql') || lowerInput.includes('sorgu')) {
            return `💻 **SQL Sorgusu**\n\n\`\`\`sql\nSELECT \n  p.product_name,\n  COUNT(o.order_id) as total_orders,\n  SUM(o.quantity) as total_quantity,\n  SUM(o.total_amount) as revenue\nFROM products p\nJOIN orders o ON p.product_id = o.product_id\nWHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY p.product_id, p.product_name\nORDER BY revenue DESC\nLIMIT 10;\n\`\`\`\n\nBu sorgu son 30 günün en çok satan 10 ürününü getirir. Çalıştırmak ister misiniz?`
        }

        if (lowerInput.includes('veritabanı') || lowerInput.includes('tablo')) {
            return `🗄️ **Veritabanı Erişimi**\n\nVeritabanı özellikleri kaldırıldı. API analizi özelliğini kullanabilirsiniz.\n\nMevcut özellikler:\n• API performans analizi\n• Endpoint testleri\n• Yanıt süresi ölçümü\n• Hata analizi\n\nAPI Analizi butonuna tıklayarak test yapabilirsiniz.`
        }


        if (lowerInput.includes('api') || lowerInput.includes('endpoint')) {
            return `🔌 **API Analizi**\n\nAPI arayüzünü açmak için sağ üstteki "API Analizi" butonuna tıklayın.\n\nMevcut özellikler:\n• Tüm API endpointlerini test et\n• API performans analizi\n• Yanıt süreleri ölçümü\n• Hata analizi\n• Gerçek zamanlı API durumu\n\nHangi API'yi test etmek istiyorsunuz?`
        }

        return `Anladım! "${userInput}" hakkında size yardımcı olabilirim. \n\nŞu konularda uzmanım:\n• Satış ve trend analizi\n• Müşteri segmentasyonu\n• Rapor oluşturma\n• SQL sorguları\n• İş stratejileri\n• Veri görselleştirme\n\nDaha spesifik bir soru sorabilir veya yukarıdaki konulardan birini seçebilirsiniz.`
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }


    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
        alert('📋 Mesaj kopyalandı!')
    }

    // Mesaj silme fonksiyonu
    const deleteMessage = (messageId: string) => {
        if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
            return
        }

        // Mesajı state'ten kaldır
        setMessages(prev => {
            const filtered = prev.filter(msg => msg.id !== messageId)
            
            // Oturum mesajlarını güncelle
            if (currentSessionId) {
                saveSessionMessages(currentSessionId, filtered)
            }
            
            return filtered
        })
    }

    // Ses ayarlarını kaydet
    const saveVoiceSettings = (settings: typeof voiceSettings) => {
        setVoiceSettings(settings)
        
        // Sadece gerekli alanları kaydet (büyük verileri temizle)
        const cleanSettings = {
            rate: settings.rate || 1.0,
            pitch: settings.pitch || 1.0,
            volume: settings.volume || 1.0,
            voiceName: settings.voiceName || null,
            lang: settings.lang || 'tr-TR'
        }
        
        try {
            localStorage.setItem('ajax_voice_settings', JSON.stringify(cleanSettings))
        } catch (error: any) {
            // Quota hatası durumunda localStorage'ı temizle ve tekrar dene
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('⚠️ localStorage quota aşıldı, temizleniyor...')
                try {
                    // Sadece ajax ile ilgili eski verileri temizle
                    const keysToRemove = []
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i)
                        if (key && key.startsWith('ajax_') && key !== 'ajax_voice_settings') {
                            keysToRemove.push(key)
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key))
                    
                    // Tekrar dene
                    localStorage.setItem('ajax_voice_settings', JSON.stringify(cleanSettings))
                    console.log('✅ localStorage temizlendi ve ayarlar kaydedildi')
                } catch (retryError) {
                    console.error('❌ localStorage temizleme hatası:', retryError)
                    // Hata devam ederse sadece state'te tut, localStorage'a kaydetme
                    console.warn('⚠️ Ayarlar sadece session için kaydedildi (localStorage dolu)')
                }
            } else {
                console.error('❌ localStorage kayıt hatası:', error)
            }
        }
    }

    // Seslendirmeyi duraklat/devam ettir
    const togglePauseResume = () => {
        if (!window.speechSynthesis) return

        if (isPaused) {
            window.speechSynthesis.resume()
            setIsPaused(false)
        } else {
            window.speechSynthesis.pause()
            setIsPaused(true)
        }
    }

    // Seslendirmeyi durdur
    const stopSpeaking = () => {
        // Web Speech API'yi durdur
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        
        // ElevenLabs audio'yu durdur (eğer çalıyorsa)
        const audioElements = document.querySelectorAll('audio[id^="elevenlabs-audio-"]')
        audioElements.forEach(audioEl => {
            const audio = audioEl as HTMLAudioElement
            audio.pause()
            audio.currentTime = 0
            audio.remove()
        })
        
        setIsSpeaking(false)
        setIsPaused(false)
        setSpeakingMessageId(null)
        speechSynthesisRef.current = null
    }

    // Text-to-Speech fonksiyonu (ElevenLabs veya Web Speech API)
    const speakMessage = async (content: string, messageId: string) => {
        // Eğer aynı mesaj konuşuyorsa durdur
        if (isSpeaking && speakingMessageId === messageId) {
            stopSpeaking()
            return
        }

        // Eğer başka bir mesaj konuşuyorsa durdur ve yenisini başlat
        if (isSpeaking && speechSynthesisRef.current) {
            stopSpeaking()
        }

        // Code block'ları ve özel karakterleri temizle
        const cleanContent = content
            .replace(/```[\s\S]*?```/g, '') // Code block'ları kaldır
            .replace(/`[^`]+`/g, '') // Inline code'ları kaldır
            .replace(/[#*_~]/g, '') // Markdown karakterlerini kaldır
            .replace(/\n{3,}/g, '\n\n') // Çoklu satır sonlarını azalt
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Link metinlerini al
            .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // Resimleri kaldır
            .trim()

        if (!cleanContent) {
            alert('Seslendirilecek içerik bulunamadı')
            return
        }

        // ElevenLabs kullanılıyorsa
        if (useElevenLabs && elevenLabsConfig?.enabled && elevenLabsConfig?.apiKey) {
            console.log('🎙️ ElevenLabs kullanılıyor...', { 
                useElevenLabs, 
                enabled: elevenLabsConfig.enabled, 
                hasApiKey: !!elevenLabsConfig.apiKey,
                textLength: cleanContent.length
            })
            
            // ElevenLabs karakter limiti: 5000 karakter (güvenli limit: 4000)
            const MAX_CHUNK_SIZE = 4000
            
            // Metni parçalara böl (cümle sonlarında böl)
            const splitTextIntoChunks = (text: string, maxSize: number): string[] => {
                if (text.length <= maxSize) {
                    return [text]
                }
                
                const chunks: string[] = []
                let currentChunk = ''
                
                // Cümle sonlarını bul (. ! ? ile biten cümleler)
                const sentences = text.split(/([.!?]\s+)/)
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i]
                    const testChunk = currentChunk + sentence
                    
                    if (testChunk.length <= maxSize) {
                        currentChunk = testChunk
                    } else {
                        // Mevcut chunk'ı kaydet
                        if (currentChunk.trim()) {
                            chunks.push(currentChunk.trim())
                        }
                        // Yeni chunk başlat
                        if (sentence.length > maxSize) {
                            // Cümle çok uzunsa kelime bazlı böl
                            const words = sentence.split(/(\s+)/)
                            let wordChunk = ''
                            for (const word of words) {
                                if ((wordChunk + word).length <= maxSize) {
                                    wordChunk += word
                                } else {
                                    if (wordChunk.trim()) {
                                        chunks.push(wordChunk.trim())
                                    }
                                    wordChunk = word
                                }
                            }
                            currentChunk = wordChunk
                        } else {
                            currentChunk = sentence
                        }
                    }
                }
                
                // Son chunk'ı ekle
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim())
                }
                
                return chunks.filter(chunk => chunk.length > 0)
            }
            
            const textChunks = splitTextIntoChunks(cleanContent, MAX_CHUNK_SIZE)
            console.log(`📝 Metin ${textChunks.length} parçaya bölündü`, { 
                totalLength: cleanContent.length,
                chunks: textChunks.map(c => c.length)
            })
            
            try {
                setIsSpeaking(true)
                setSpeakingMessageId(messageId)
                
                // Her parçayı sırayla oynat
                for (let i = 0; i < textChunks.length; i++) {
                    const chunk = textChunks[i]
                    console.log(`🎵 Parça ${i + 1}/${textChunks.length} oynatılıyor...`, { 
                        length: chunk.length 
                    })

                    const response = await ElevenLabsService.textToSpeech({
                        text: chunk,
                        voiceId: elevenLabsConfig.defaultVoiceId,
                        modelId: elevenLabsConfig.defaultModelId,
                        outputFormat: elevenLabsConfig.defaultOutputFormat
                    })

                    if (response && response.audio) {
                        console.log(`✅ Parça ${i + 1}/${textChunks.length} audio alındı, oynatılıyor...`)
                        
                        // Data URL'den blob oluştur (CSP uyumluluğu için)
                        let audioUrl = response.audio
                        if (audioUrl.startsWith('data:')) {
                            try {
                                // Data URL'den base64'i çıkar
                                const base64Data = audioUrl.split(',')[1]
                                const binaryString = atob(base64Data)
                                const bytes = new Uint8Array(binaryString.length)
                                for (let j = 0; j < binaryString.length; j++) {
                                    bytes[j] = binaryString.charCodeAt(j)
                                }
                                const blob = new Blob([bytes], { type: 'audio/mpeg' })
                                audioUrl = URL.createObjectURL(blob)
                                console.log(`✅ Parça ${i + 1} blob URL oluşturuldu`)
                            } catch (error) {
                                console.error('❌ Blob oluşturma hatası:', error)
                                // Fallback: data URL kullan
                            }
                        }
                        
                        const audio = new Audio(audioUrl)
                        
                        // Audio element'ini DOM'a ekle (stopSpeaking için)
                        audio.id = `elevenlabs-audio-${messageId}-${i}`
                        if (!document.getElementById(audio.id)) {
                            document.body.appendChild(audio)
                        }
                        
                        // Blob URL'yi sakla (temizleme için)
                        const audioBlobUrl = audioUrl.startsWith('blob:') ? audioUrl : null
                        
                        // Promise ile audio'nun bitmesini bekle
                        await new Promise<void>((resolve, reject) => {
                            audio.onended = () => {
                                console.log(`✅ Parça ${i + 1}/${textChunks.length} tamamlandı`)
                                // Audio element'ini temizle
                                const audioEl = document.getElementById(audio.id)
                                if (audioEl) {
                                    audioEl.remove()
                                }
                                // Blob URL'yi temizle
                                if (audioBlobUrl) {
                                    URL.revokeObjectURL(audioBlobUrl)
                                }
                                resolve()
                            }
                            
                            audio.onerror = (error) => {
                                console.error(`❌ Parça ${i + 1} playback hatası:`, error)
                                // Audio element'ini temizle
                                const audioEl = document.getElementById(audio.id)
                                if (audioEl) {
                                    audioEl.remove()
                                }
                                // Blob URL'yi temizle
                                if (audioBlobUrl) {
                                    URL.revokeObjectURL(audioBlobUrl)
                                }
                                reject(error)
                            }
                            
                            audio.onpause = () => {
                                setIsPaused(true)
                            }
                            
                            audio.onplay = () => {
                                setIsPaused(false)
                            }
                            
                            // Audio'yu oynat
                            audio.play().catch(reject)
                        })
                    } else {
                        throw new Error(`Parça ${i + 1} için ElevenLabs yanıt alınamadı`)
                    }
                }
                
                // Tüm parçalar tamamlandı
                console.log('✅ Tüm parçalar oynatıldı')
                setIsSpeaking(false)
                setIsPaused(false)
                setSpeakingMessageId(null)
                return
            } catch (error: any) {
                console.error('❌ ElevenLabs text-to-speech hatası:', error)
                setIsSpeaking(false)
                setIsPaused(false)
                setSpeakingMessageId(null)
                // Hata mesajını göster ama fallback'e geç
                console.log('🔄 ElevenLabs başarısız, Web Speech API\'ye geri dönülüyor...')
                // Fallback için aşağıdaki Web Speech API koduna devam et
            }
        } else {
            console.log('ℹ️ ElevenLabs kullanılmıyor:', { 
                useElevenLabs, 
                enabled: elevenLabsConfig?.enabled, 
                hasApiKey: !!elevenLabsConfig?.apiKey 
            })
            
            // ElevenLabs config varsa ama toggle kapalıysa, kullanıcıya bilgi ver
            if (elevenLabsConfig?.enabled && elevenLabsConfig?.apiKey) {
                console.warn('⚠️ ElevenLabs config mevcut ama toggle kapalı. Lütfen toggle butonuna tıklayın.')
                // Web Speech API kullanma, sadece bilgi ver
                alert('ElevenLabs API key mevcut. Premium ses için toggle butonuna (🧠) tıklayın.')
                return
            }
        }

        // Web Speech API kaldırıldı - Sadece ElevenLabs kullanılıyor
        // Eğer ElevenLabs yoksa veya hata olursa, seslendirme yapılmaz
        console.warn('⚠️ Seslendirme yapılamadı: ElevenLabs aktif değil veya config eksik')
        alert('Seslendirme için ElevenLabs API key gerekli. Lütfen ayarlardan API key\'inizi girin ve toggle butonunu aktif edin.')
    }

    // Mikrofon izni kontrolü ve isteme
    const checkMicrophonePermission = async (): Promise<boolean> => {
        try {
            // navigator.permissions API kontrolü
            if (navigator.permissions) {
                try {
                    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
                    if (result.state === 'granted') {
                        return true
                    } else if (result.state === 'denied') {
                        alert('Mikrofon izni reddedilmiş. Lütfen tarayıcı ayarlarından izin verin:\n\nChrome: Ayarlar > Gizlilik ve Güvenlik > Site Ayarları > Mikrofon\n\nFirefox: Ayarlar > Gizlilik ve Güvenlik > İzinler > Mikrofon')
                        return false
                    }
                } catch (e) {
                    // permissions API desteklenmiyor, getUserMedia ile kontrol et
                    console.log('Permissions API desteklenmiyor, getUserMedia ile kontrol ediliyor...')
                }
            }

            // getUserMedia ile mikrofon erişimini test et
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                // İzin verildi, stream'i kapat
                stream.getTracks().forEach(track => track.stop())
                return true
            } catch (error: any) {
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    alert('Mikrofon izni verilmedi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin:\n\nChrome: Adres çubuğundaki kilit ikonuna tıklayın > Mikrofon > İzin Ver\n\nFirefox: Adres çubuğundaki kilit ikonuna tıklayın > Mikrofon > İzin Ver')
                    return false
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    alert('Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.')
                    return false
                } else {
                    console.error('Mikrofon izni kontrolü hatası:', error)
                    // Hata olsa bile devam et, Speech Recognition kendi iznini kontrol edecek
                    return true
                }
            }
        } catch (error) {
            console.error('Mikrofon izni kontrolü genel hatası:', error)
            // Hata olsa bile devam et
            return true
        }
    }

    // Speech Recognition (Voice Input) fonksiyonu
    const startVoiceInput = async () => {
        // Web Speech Recognition API kontrolü
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        
        if (!SpeechRecognition) {
            alert('Tarayıcınız sesli girdi özelliğini desteklemiyor. Chrome veya Edge kullanmanız önerilir.')
            return
        }

        // Mikrofon izni kontrolü
        const hasPermission = await checkMicrophonePermission()
        if (!hasPermission) {
            setIsListening(false)
            return
        }

        try {
            // Önceki recognition'ı durdur
            if (recognitionRef.current) {
                recognitionRef.current.stop()
                recognitionRef.current = null
            }

            // Yeni recognition oluştur
            const recognition = new SpeechRecognition()
            recognition.lang = 'tr-TR' // Türkçe
            recognition.continuous = false // Tek seferlik
            recognition.interimResults = true // Geçici sonuçları göster
            recognition.maxAlternatives = 1

            // Event handler'lar
            recognition.onstart = () => {
                setIsListening(true)
                setTranscript('')
                console.log('🎤 Sesli girdi başlatıldı')
            }

            recognition.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' '
                    } else {
                        interimTranscript += transcript
                    }
                }

                // Geçici ve final sonuçları birleştir
                const fullTranscript = finalTranscript + interimTranscript
                setTranscript(fullTranscript)
                
                // Input alanına yaz
                if (inputRef.current) {
                    inputRef.current.value = fullTranscript
                    setInput(fullTranscript)
                }
            }

            recognition.onerror = async (event: any) => {
                console.error('❌ Speech recognition hatası:', event.error)
                setIsListening(false)
                
                let errorMessage = 'Sesli girdi hatası oluştu'
                let showAlert = true
                
                if (event.error === 'no-speech') {
                    errorMessage = 'Konuşma algılanamadı. Lütfen tekrar deneyin.'
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'Mikrofon erişimi sağlanamadı. Lütfen mikrofon iznini kontrol edin ve tekrar deneyin.'
                    // İzin tekrar kontrol et
                    const hasPermission = await checkMicrophonePermission()
                    if (!hasPermission) {
                        return
                    }
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Mikrofon izni verilmedi.\n\nLütfen:\n1. Tarayıcı ayarlarından mikrofon iznini etkinleştirin\n2. Sayfayı yenileyin\n3. Tekrar deneyin'
                    // İzin tekrar kontrol et
                    const hasPermission = await checkMicrophonePermission()
                    if (!hasPermission) {
                        return
                    }
                } else if (event.error === 'network') {
                    errorMessage = 'Ağ hatası oluştu. İnternet bağlantınızı kontrol edin.'
                } else if (event.error === 'aborted') {
                    // Kullanıcı tarafından durduruldu, alert gösterme
                    showAlert = false
                } else {
                    errorMessage = `Sesli girdi hatası: ${event.error}`
                }
                
                if (showAlert) {
                    alert(errorMessage)
                }
            }

            recognition.onend = () => {
                setIsListening(false)
                console.log('🎤 Sesli girdi durduruldu')
                
                // Eğer input'ta metin varsa, otomatik gönder
                setTimeout(() => {
                    if (inputRef.current && inputRef.current.value.trim()) {
                        const finalText = inputRef.current.value.trim()
                        if (finalText && finalText.length > 0) {
                            // Kısa bir gecikme sonra gönder (kullanıcı düzenleyebilsin)
                            setTimeout(() => {
                                if (inputRef.current && inputRef.current.value.trim()) {
                                    handleSend()
                                }
                            }, 500)
                        }
                    }
                }, 100)
            }

            // Recognition'ı başlat
            recognition.start()
            recognitionRef.current = recognition
        } catch (error) {
            console.error('❌ Speech recognition başlatma hatası:', error)
            alert('Sesli girdi başlatılamadı')
            setIsListening(false)
        }
    }

    const stopVoiceInput = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setIsListening(false)
        setTranscript('')
    }

    // Component unmount olduğunda konuşmayı ve recognition'ı durdur
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    // Ses listesi yüklendiğinde (Chrome için)
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
                console.log('✅ Sesler yüklendi:', voices.map(v => v.name))
                setAvailableVoices(voices)
                
                // Eğer seçili ses yoksa, varsayılan Türkçe sesi seç
                if (!voiceSettings.voiceName) {
                    const turkishVoice = voices.find(voice => 
                        voice.lang.startsWith('tr') || 
                        voice.name.toLowerCase().includes('turkish') ||
                        voice.name.toLowerCase().includes('türkçe')
                    )
                    if (turkishVoice) {
                        saveVoiceSettings({ ...voiceSettings, voiceName: turkishVoice.name })
                    }
                }
            }
        }

        if (window.speechSynthesis) {
            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    // CSV export function removed

    // Streaming animasyonu için yazıyormuş gibi efekt
    const simulateTyping = (text: string, callback: (content: string) => void) => {
        let index = 0
        const interval = setInterval(() => {
            if (index < text.length) {
                callback(text.slice(0, index + 1))
                index++
            } else {
                clearInterval(interval)
            }
        }, 30) // 30ms gecikme ile yazıyormuş gibi görünüm
    }

    // Kod bloklarını tespit edip tarayıcı önizlemesi üret
    const extractCodeBlock = (text: string): { lang: string; code: string } | null => {
        const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
            const lang = (match[1] || '').toLowerCase();
            const code = match[2] || '';
            return { lang, code };
        }
        // Saf HTML olasılığı
        if (/<\/?(html|head|body|div|span|script|style)/i.test(text)) {
            return { lang: 'html', code: text };
        }
        return null;
    };

    const buildPreviewHtml = (payload: { lang: string; code: string } | null): string | null => {
        if (!payload) return null;
        const { lang, code } = payload;
        if (lang === 'html' || lang === 'htm') return code;
        if (lang === 'css') {
            return `<!doctype html><html><head><meta charset="utf-8"/><style>${code}</style></head><body><div style="padding:16px;font-family:ui-sans-serif">CSS önizleme için örnek içerik</div></body></html>`;
        }
        if (lang === 'javascript' || lang === 'js' || lang === 'ts' || lang === 'typescript') {
            return `<!doctype html><html><head><meta charset="utf-8"/></head><body><div id="app" style="padding:16px;font-family:ui-sans-serif">JS önizleme alanı</div><script>${code}<\/script></body></html>`;
        }
        return null;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex bg-white dark:bg-[#212121]">
            {/* Left Sidebar - ChatGPT Style */}
            <div className={`w-64 bg-[#171717] dark:bg-[#1a1a1a] border-r border-gray-800 dark:border-gray-700 flex flex-col transition-all duration-300 ${showSessions ? '' : 'hidden lg:flex'}`}>
                {/* New Chat Button */}
                <button
                    onClick={createNewSession}
                    className="m-3 px-3 py-2.5 border border-gray-700 dark:border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-white text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Konuşma</span>
                </button>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {isLoadingSessions ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Database className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                            <p className="text-sm text-gray-400">Henüz konuşma yok</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`group w-full px-3 py-2.5 rounded-lg transition-colors ${
                                    currentSessionId === session.id
                                        ? 'bg-gray-800 dark:bg-gray-700'
                                        : 'hover:bg-gray-800/50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <button
                                    onClick={() => setCurrentSessionId(session.id)}
                                    className="w-full text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm truncate flex-1 ${
                                            currentSessionId === session.id ? 'text-white' : 'text-gray-300'
                                        }`}>
                                            {session.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteSession(session.id)
                                            }}
                                            className="ml-2 p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded transition-all opacity-0 group-hover:opacity-100"
                                            title="Sohbeti Sil"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400 transition-colors" />
                                        </button>
                                    </div>
                                    <p className={`text-xs mt-1 ${
                                        currentSessionId === session.id ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {session.messageCount} mesaj
                                    </p>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="p-3 border-t border-gray-800 dark:border-gray-700 space-y-2">
                    <button
                        onClick={() => setShowAiSettings(!showAiSettings)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Ayarlar</span>
                    </button>
                    <button
                        onClick={() => setShowApiAnalysis(!showApiAnalysis)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>API Analizi</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area - ChatGPT Style */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar - Minimal */}
                <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-[#212121]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSessions(!showSessions)}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Ajax AI</h1>
                        {currentSessionId && (
                            <button
                                onClick={() => deleteSession(currentSessionId)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-500 dark:text-red-400"
                                title="Aktif Sohbeti Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                            geminiStatus === 'online' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                            {geminiStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </span>
                        <button
                            onClick={toggleAutoSpeak}
                            className={`p-2 rounded-lg transition-colors ${
                                autoSpeakEnabled 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            title="Seslendirme"
                        >
                            {autoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={toggleElevenLabs}
                            className={`p-2 rounded-lg transition-colors ${
                                useElevenLabs 
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            title={useElevenLabs ? 'ElevenLabs aktif (Premium ses)' : 'ElevenLabs pasif (Web Speech API)'}
                        >
                            <Brain className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* AI Settings Inline Panel - Sadeleştirilmiş */}
                {showAiSettings && (
                    <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                            API Key
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="password"
                                value={aiApiKeyLocal} 
                                onChange={(e)=> setAiApiKeyLocal(e.target.value)} 
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveApiKey()
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-400" 
                                placeholder="Gemini API Key girin" 
                            />
                            <button
                                onClick={handleSaveApiKey}
                                disabled={aiSaving || !aiApiKeyLocal.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {aiSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Kaydediliyor...</span>
                                    </>
                                ) : (
                                    <span>Kaydet</span>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                API Key almak için tıklayın
                            </a>
                        </p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                            Model {geminiStatus === 'online' && geminiModels.length > 0 && `(${geminiModels.length} model)`}
                        </label>
                        {geminiStatus === 'online' && geminiModels.length > 0 ? (
                            <select 
                                value={aiModel} 
                                onChange={(e)=> setAiModel(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100"
                            >
                                {geminiModels.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        ) : (
                            <select 
                                value={aiModel} 
                                onChange={(e)=> setAiModel(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100"
                            >
                                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                            </select>
                        )}
                        {geminiStatus === 'checking' && (
                            <p className="text-xs text-gray-400 mt-1">Modeller yükleniyor...</p>
                        )}
                        {geminiStatus === 'offline' && (
                            <p className="text-xs text-red-400 mt-1">Gemini servisi çevrimdışı - API key gerekli</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Durum</label>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                geminiStatus === 'online' ? 'bg-green-500' : 
                                geminiStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                                'bg-red-500'
                            }`}></div>
                            <span className="text-xs text-gray-600 dark:text-slate-300">
                                {geminiStatus === 'online' ? 'Çevrimiçi' : 
                                 geminiStatus === 'checking' ? 'Kontrol ediliyor...' : 
                                 'Çevrimdışı'}
                            </span>
                            <button
                                onClick={checkGeminiStatus}
                                className="ml-auto px-2 py-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
                            >
                                Yenile
                            </button>
                        </div>
                    </div>
                    
                    {/* ElevenLabs API Key */}
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                            ElevenLabs API Key {elevenLabsConfig?.enabled && <span className="text-green-500">✓</span>}
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="password"
                                value={elevenLabsApiKeyLocal} 
                                onChange={(e)=> setElevenLabsApiKeyLocal(e.target.value)} 
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveElevenLabsApiKey()
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-400" 
                                placeholder={elevenLabsConfig?.apiKeyMasked ? "API key kayıtlı (yeni key girin)" : "ElevenLabs API Key girin"} 
                            />
                            <button
                                onClick={handleSaveElevenLabsApiKey}
                                disabled={elevenLabsSaving || !elevenLabsApiKeyLocal.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                {elevenLabsSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Kaydediliyor...</span>
                                    </>
                                ) : (
                                    <span>Kaydet</span>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                                ElevenLabs API Key almak için tıklayın
                            </a>
                        </p>
                        {elevenLabsConfig?.defaultVoiceId && (
                            <p className="text-xs text-gray-500 mt-1">
                                Varsayılan Ses: {elevenLabsConfig.defaultVoiceId}
                            </p>
                        )}
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-2">Ses Motoru Ayarları</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">
                            <div className="flex items-center gap-3">
                                <Volume2 className={`w-5 h-5 ${autoSpeakEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                        Otomatik Seslendirme
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                        Yeni AI yanıtları otomatik olarak seslendirilir
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={toggleAutoSpeak}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    autoSpeakEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        autoSpeakEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
                )}

                {/* Session Management Interface - Sadeleştirilmiş */}
                {showSessions && (
                    <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-80">
                        {/* Left Panel - Session List */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Database className="w-3.5 h-3.5" />
                                    <span>Oturumlar</span>
                                </h3>
                                <button
                                    onClick={createNewSession}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1"
                                >
                                    <Settings className="w-3 h-3" />
                                    <span>Yeni</span>
                                </button>
                            </div>
                            
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {isLoadingSessions ? (
                                    <div className="text-center py-4 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                                        <p className="text-gray-600 dark:text-slate-300 text-xs">Yükleniyor...</p>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center py-4 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Database className="w-5 h-5 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                        <p className="text-xs text-gray-600 dark:text-slate-300">Henüz oturum yok</p>
                                    </div>
                                ) : (
                                    sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`p-2 border rounded cursor-pointer ${
                                                currentSessionId === session.id
                                                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-700 bg-white dark:bg-slate-700'
                                            }`}
                                            onClick={() => setCurrentSessionId(session.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm truncate text-gray-900 dark:text-slate-100">
                                                    {session.name}
                                                </h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteSession(session.id)
                                                    }}
                                                    className="p-1 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                    title="Sohbeti Sil"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {session.messageCount} mesaj • {session.createdAt.toLocaleDateString('tr-TR')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Session Details - Sadeleştirilmiş */}
                        <div className="lg:col-span-2 border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Oturum Bilgileri</span>
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                    {currentSessionId ? `ID: ${currentSessionId?.slice(0, 8)}...` : 'Oturum seçilmedi'}
                                </div>
                            </div>
                            
                            {currentSessionId ? (
                                <div className="space-y-3">
                                    <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                        <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Aktif Oturum</h4>
                                        <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                                            <div className="flex items-center justify-between">
                                                <span>Mesaj Sayısı:</span>
                                                <span className="font-medium">{messages.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Oluşturulma:</span>
                                                <span>{sessions.find(s => s.id === currentSessionId)?.createdAt.toLocaleString('tr-TR')}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Son Güncelleme:</span>
                                                <span>{sessions.find(s => s.id === currentSessionId)?.updatedAt.toLocaleString('tr-TR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                        <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Son Mesajlar</h4>
                                        <div className="space-y-2 max-h-36 overflow-y-auto">
                                            {messages.slice(-3).map((msg, index) => (
                                                <div key={index} className="text-xs border border-gray-200 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-800">
                                                    <div className="px-2 py-1 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                                                        <span className="text-gray-700 dark:text-slate-300">{msg.role === 'user' ? 'Admin' : 'Ajax'}</span>
                                                        <span className="text-gray-500 dark:text-slate-400">
                                                            {msg.timestamp instanceof Date 
                                                                ? msg.timestamp.toLocaleTimeString('tr-TR')
                                                                : new Date(msg.timestamp || Date.now()).toLocaleTimeString('tr-TR')
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="p-2 text-gray-700 dark:text-slate-300">
                                                        <div className="truncate">{msg.content.substring(0, 50)}...</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-gray-200 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                    <Database className="w-6 h-6 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                    <p className="text-sm text-gray-600 dark:text-slate-300">Lütfen bir oturum seçin</p>
                                </div>
                        )}
                    </div>
                    
                    {/* ElevenLabs API Key */}
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                            ElevenLabs API Key {elevenLabsConfig?.enabled && <span className="text-green-500">✓</span>}
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="password"
                                value={elevenLabsApiKeyLocal} 
                                onChange={(e)=> setElevenLabsApiKeyLocal(e.target.value)} 
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveElevenLabsApiKey()
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-400" 
                                placeholder={elevenLabsConfig?.apiKeyMasked ? "API key kayıtlı (yeni key girin)" : "ElevenLabs API Key girin"} 
                            />
                            <button
                                onClick={handleSaveElevenLabsApiKey}
                                disabled={elevenLabsSaving || !elevenLabsApiKeyLocal.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                {elevenLabsSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Kaydediliyor...</span>
                                    </>
                                ) : (
                                    <span>Kaydet</span>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                                ElevenLabs API Key almak için tıklayın
                            </a>
                        </p>
                        {elevenLabsConfig?.defaultVoiceId && (
                            <p className="text-xs text-gray-500 mt-1">
                                Varsayılan Ses: {elevenLabsConfig.defaultVoiceId}
                            </p>
                        )}
                    </div>
                </div>
                </div>
            )}

                {/* API Analysis Interface - Sadeleştirilmiş */}
                {showApiAnalysis && (
                    <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-80">
                        {/* Left Panel - API Controls */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>API Testleri</span>
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={testAllApiEndpoints}
                                        disabled={isAnalyzing}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                                        <span>Tümünü Test Et</span>
                                    </button>
                                    <button
                                        onClick={analyzeApiPerformance}
                                        disabled={isAnalyzing}
                                        className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <BarChart3 className="w-3 h-3" />
                                        <span>Performans</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                    <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Endpoint'ler</h4>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div className="text-gray-600 dark:text-slate-300">/admin/orders</div>
                                        <div className="text-gray-600 dark:text-slate-300">/admin/users</div>
                                        <div className="text-gray-600 dark:text-slate-300">/products</div>
                                        <div className="text-gray-600 dark:text-slate-300">/categories</div>
                                        <div className="text-gray-600 dark:text-slate-300">/analytics/monthly</div>
                                        <div className="text-gray-600 dark:text-slate-300">/admin/visitor-ips</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Results */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span>Sonuçlar</span>
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                    {apiResults.length} endpoint test edildi
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {apiResults.length === 0 && !isAnalyzing && (
                                    <div className="text-center py-8 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                        <p className="text-sm text-gray-600 dark:text-slate-300">Henüz test yapılmadı</p>
                                    </div>
                                )}
                                
                                {isAnalyzing && (
                                    <div className="text-center py-8 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                                        <p className="text-sm text-gray-600 dark:text-slate-300">Test ediliyor...</p>
                                    </div>
                                )}
                                
                                {apiResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 border rounded ${result.status === 'success' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30' : result.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm truncate text-gray-900 dark:text-slate-100">{result.endpoint}</div>
                                            <div className={`px-2 py-0.5 rounded text-xs ${result.status === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-400' : result.status === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-400'}`}>
                                                {result.status === 'success' ? 'Başarılı' : result.status === 'error' ? 'Hata' : 'Yükleniyor'}
                                            </div>
                                        </div>
                                        
                                        {result.responseTime && (
                                            <div className="text-xs text-gray-600 dark:text-slate-300 flex justify-between">
                                                <span>Yanıt Süresi:</span>
                                                <span>{result.responseTime}ms</span>
                                            </div>
                                        )}
                                        
                                        {result.data && typeof result.data === 'object' && result.data.averageResponseTime && (
                                            <div className="text-xs text-gray-600 dark:text-slate-300 flex justify-between">
                                                <span>Ort/Min/Max:</span>
                                                <span>{result.data.averageResponseTime}/{result.data.minResponseTime}/{result.data.maxResponseTime}ms</span>
                                            </div>
                                        )}
                                        
                                        {result.error && (
                                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Hata: {result.error}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Messages Area - ChatGPT Style */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-[#212121]">
                    <div className="max-w-3xl mx-auto px-4 py-8">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
                                className={`group py-6 ${message.role === 'user' ? 'bg-white dark:bg-[#212121]' : 'bg-gray-50 dark:bg-[#2a2a2a]'} -mx-4 px-4`}
                            >
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex gap-4">
                                        {/* Avatar */}
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            message.role === 'user' 
                                                ? 'bg-green-500' 
                                                : 'bg-[#19c37d]'
                                        }`}>
                                            {message.role === 'user' ? (
                                                <User className="w-5 h-5 text-white" />
                                            ) : (
                                                <Bot className="w-5 h-5 text-white" />
                                            )}
                                        </div>

                                        {/* Message Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                {(() => {
                                                    const block = extractCodeBlock(message.content);
                                                    if (block && message.role === 'assistant') {
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-700 dark:border-gray-600">
                                                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-600">
                                                                        <span className="text-xs text-gray-400 font-mono">{block.lang || 'code'}</span>
                                                                        <button
                                                                            onClick={() => copyMessage(block.code)}
                                                                            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                                                        >
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                            <span>Kopyala</span>
                                                                        </button>
                                                                    </div>
                                                                    <pre className="p-4 overflow-x-auto">
                                                                        <code className="text-sm text-gray-100 font-mono">{block.code}</code>
                                                                    </pre>
                                                                </div>
                                                                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed">
                                                                    {message.content.replace(/```[\s\S]*?```/g, '').trim()}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed">
                                                            {message.content}
                                                            {isStreaming && message.role === 'assistant' && message.content === streamingContent && (
                                                                <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Message Actions - ChatGPT Style */}
                                            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {message.role === 'assistant' && !extractCodeBlock(message.content) && (
                                                    <>
                                                        <button
                                                            onClick={() => copyMessage(message.content)}
                                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                                            title="Kopyala"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <div className="flex items-center gap-1">
                                                            {isSpeaking && speakingMessageId === message.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={togglePauseResume}
                                                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-green-600 dark:text-green-400"
                                                                        title={isPaused ? "Devam Et" : "Duraklat"}
                                                                    >
                                                                        {isPaused ? (
                                                                            <PlayCircle className="w-4 h-4" />
                                                                        ) : (
                                                                            <Pause className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={stopSpeaking}
                                                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-red-600 dark:text-red-400"
                                                                        title="Durdur"
                                                                    >
                                                                        <VolumeX className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => speakMessage(message.content, message.id)}
                                                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                                                        title="Seslendir"
                                                                    >
                                                                        <Volume2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowVoiceSettings(true)}
                                                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                                                        title="Ses Ayarları"
                                                                    >
                                                                        <Sliders className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => deleteMessage(message.id)}
                                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-auto"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator - ChatGPT Style */}
                        {isTyping && (
                            <div className="py-6 bg-gray-50 dark:bg-[#2a2a2a] -mx-4 px-4">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex gap-1.5 items-center pt-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Typing Indicator - ChatGPT Style */}
                        {isTyping && (
                            <div className="py-6 bg-gray-50 dark:bg-[#2a2a2a] -mx-4 px-4">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex gap-1.5 items-center pt-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area - ChatGPT Style */}
                <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212121]">
                    <div className="max-w-3xl mx-auto px-4 py-4">
                        {/* Yüklenen dosyalar */}
                        {uploadedFiles.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300"
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span className="max-w-[150px] truncate">{file.name}</span>
                                        <button
                                            onClick={() => {
                                                const newFiles = [...uploadedFiles]
                                                newFiles.splice(index, 1)
                                                setUploadedFiles(newFiles)
                                            }}
                                            className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Input Container */}
                        <div className="relative">
                            {isListening && (
                                <div className="absolute -top-8 left-0 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span>Dinleniyor...</span>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Mesaj gönder..."
                                        rows={1}
                                        className="w-full px-4 py-3 pr-20 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 shadow-sm transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        style={{ minHeight: '52px', maxHeight: '200px' }}
                                    />
                                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || [])
                                                    setUploadedFiles(prev => [...prev, ...files])
                                                }}
                                                accept="image/*,application/pdf,text/*,.doc,.docx"
                                            />
                                            <button
                                                type="button"
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                                title="Dosya yükle"
                                            >
                                                <Upload className="w-4 h-4" />
                                            </button>
                                        </label>
                                        <button
                                            onClick={() => isListening ? stopVoiceInput() : startVoiceInput()}
                                            className={`p-1.5 rounded transition-colors ${
                                                isListening 
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                            title="Sesli girdi"
                                        >
                                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={(!input.trim() && uploadedFiles.length === 0) || isTyping}
                                    className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                    title="Gönder"
                                >
                                    {isTyping ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                            Ajax AI, Gemini API ile desteklenmektedir. Yanıtlar hata içerebilir.
                        </p>
                    </div>
                </div>
            </div>

            {/* Ses Ayarları Modal */}
            {showVoiceSettings && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sliders className="w-5 h-5" />
                                Ses Ayarları
                            </h3>
                            <button
                                onClick={() => setShowVoiceSettings(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Ses Seçimi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ses
                                </label>
                                <select
                                    value={voiceSettings.voiceName || ''}
                                    onChange={(e) => saveVoiceSettings({ ...voiceSettings, voiceName: e.target.value || null })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Varsayılan (Otomatik Seçim)</option>
                                    {availableVoices
                                        .filter(v => v.lang.startsWith('tr') || v.lang.startsWith('en'))
                                        .map((voice) => (
                                            <option key={voice.name} value={voice.name}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Konuşma Hızı */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Konuşma Hızı: {voiceSettings.rate.toFixed(1)}x
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={voiceSettings.rate}
                                    onChange={(e) => saveVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>Yavaş</span>
                                    <span>Hızlı</span>
                                </div>
                            </div>

                            {/* Ses Tonu */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ses Tonu: {voiceSettings.pitch.toFixed(1)}
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={voiceSettings.pitch}
                                    onChange={(e) => saveVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>Düşük</span>
                                    <span>Yüksek</span>
                                </div>
                            </div>

                            {/* Ses Seviyesi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ses Seviyesi: {Math.round(voiceSettings.volume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={voiceSettings.volume}
                                    onChange={(e) => saveVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>Sessiz</span>
                                    <span>Yüksek</span>
                                </div>
                            </div>

                            {/* Önizleme Butonu */}
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        const testText = 'Merhaba, bu bir ses önizlemesidir. Ayarlarınızı test edebilirsiniz.'
                                        speakMessage(testText, 'preview')
                                    }}
                                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlayCircle className="w-4 h-4" />
                                    Önizleme
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
