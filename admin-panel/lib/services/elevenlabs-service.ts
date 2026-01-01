import { api } from '@/lib/api'

export interface ElevenLabsConfig {
  enabled: boolean
  apiKey: string
  apiKeyMasked: boolean
  defaultVoiceId: string
  defaultModelId: string
  defaultOutputFormat: string
}

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
  description?: string
  preview_url?: string
}

export interface TextToSpeechOptions {
  text: string
  voiceId?: string
  modelId?: string
  outputFormat?: string
}

export interface TextToSpeechResponse {
  success: boolean
  audio: string // base64 encoded audio data URL
  format: string
  voiceId: string
  modelId: string
}

export class ElevenLabsService {
  /**
   * Config'i getir
   */
  static async getConfig(): Promise<ElevenLabsConfig | null> {
    try {
      const response = await api.get<{ success: boolean; config: ElevenLabsConfig }>('/admin/elevenlabs/config')
      if (response.success && response.config) {
        return response.config
      }
      return null
    } catch (error) {
      console.error('❌ ElevenLabs config alınamadı:', error)
      return null
    }
  }

  /**
   * Config'i kaydet
   */
  static async saveConfig(config: Partial<ElevenLabsConfig>): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean; config: ElevenLabsConfig }>('/admin/elevenlabs/config', config)
      return response.success || false
    } catch (error) {
      console.error('❌ ElevenLabs config kaydedilemedi:', error)
      return false
    }
  }

  /**
   * Text to Speech
   */
  static async textToSpeech(options: TextToSpeechOptions): Promise<TextToSpeechResponse | null> {
    try {
      const response = await api.post<TextToSpeechResponse>('/admin/elevenlabs/text-to-speech', {
        text: options.text,
        voiceId: options.voiceId,
        modelId: options.modelId,
        outputFormat: options.outputFormat
      })
      
      if (response.success) {
        return response
      }
      return null
    } catch (error: any) {
      console.error('❌ ElevenLabs text-to-speech hatası:', error)
      throw error
    }
  }

  /**
   * Mevcut sesleri listele
   */
  static async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await api.get<{ success: boolean; voices: ElevenLabsVoice[] }>('/admin/elevenlabs/voices')
      if (response.success && Array.isArray(response.voices)) {
        return response.voices
      }
      return []
    } catch (error) {
      console.error('❌ ElevenLabs voices alınamadı:', error)
      return []
    }
  }

  /**
   * Audio data URL'ini oynat
   */
  static playAudio(audioDataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioDataUrl)
      
      audio.onended = () => {
        resolve()
      }
      
      audio.onerror = (error) => {
        reject(error)
      }
      
      audio.play().catch(reject)
    })
  }
}

