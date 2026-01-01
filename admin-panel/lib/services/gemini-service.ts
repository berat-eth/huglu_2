// Gemini AI Service - Next.js API route'ları üzerinden SDK kullanarak
// Not: CSP kuralları nedeniyle SDK server-side'da çalışıyor
// Config ve sessions artık veritabanında saklanıyor

import { api } from '../api';

export interface GeminiConfig {
  enabled: boolean;
  apiKey: string;
  apiKeyMasked?: boolean; // Backend'den maskelenmiş key gelirse true
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
  parts?: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GeminiService {
  private static readonly CONFIG_KEY = 'gemini_config'; // Fallback için
  private static readonly DEFAULT_CONFIG: GeminiConfig = {
    enabled: true,
    apiKey: '',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 8192
  };

  // Not: SDK artık server-side'da çalışıyor (Next.js API route'ları üzerinden)
  // Config ve sessions artık veritabanında saklanıyor

  // Konfigürasyonu al (veritabanından)
  static async getConfig(): Promise<GeminiConfig> {
    try {
      if (typeof window === 'undefined') return this.DEFAULT_CONFIG;
      
      try {
        // Backend'den config'i al
        const response = await api.get<{ success: boolean; config: any }>('/admin/gemini/config');
        
        if (response.success && response.config) {
          const dbConfig = response.config;
          
          // Eğer API key maskelenmişse, localStorage'dan gerçek key'i al (migration için)
          let apiKey = dbConfig.apiKey;
          if (dbConfig.apiKeyMasked && apiKey.includes('...')) {
            const localConfig = localStorage.getItem(this.CONFIG_KEY);
            if (localConfig) {
              try {
                const parsed = JSON.parse(localConfig);
                if (parsed.apiKey && !parsed.apiKey.includes('...')) {
                  apiKey = parsed.apiKey;
                  // Gerçek key'i backend'e kaydet
                  await this.saveConfig({ apiKey });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
          
          return {
            enabled: dbConfig.enabled ?? this.DEFAULT_CONFIG.enabled,
            apiKey: apiKey || this.DEFAULT_CONFIG.apiKey,
            apiKeyMasked: dbConfig.apiKeyMasked || false,
            model: dbConfig.model || this.DEFAULT_CONFIG.model,
            temperature: dbConfig.temperature ?? this.DEFAULT_CONFIG.temperature,
            maxTokens: dbConfig.maxTokens ?? this.DEFAULT_CONFIG.maxTokens
          };
        }
      } catch (error) {
        console.warn('⚠️ Backend\'den config alınamadı, localStorage\'dan deneniyor:', error);
        
        // Fallback: localStorage'dan dene (migration için)
        const stored = localStorage.getItem(this.CONFIG_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Eğer localStorage'da gerçek bir key varsa, backend'e kaydet
            if (parsed.apiKey && !parsed.apiKey.includes('...')) {
              await this.saveConfig(parsed).catch(() => {});
            }
            return { ...this.DEFAULT_CONFIG, ...parsed };
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      return this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('❌ Gemini config alınamadı:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  // Konfigürasyonu kaydet (veritabanına)
  static async saveConfig(config: Partial<GeminiConfig>): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      try {
        // Backend'e kaydet
        const response = await api.post<{ success: boolean; config: any }>('/admin/gemini/config', config);
        
        if (response.success) {
          console.log('✅ Gemini config veritabanına kaydedildi');
          
          // localStorage'dan eski config'i temizle (artık gerek yok)
          try {
            localStorage.removeItem(this.CONFIG_KEY);
          } catch (e) {
            // Ignore
          }
        } else {
          throw new Error('Config kaydedilemedi');
        }
      } catch (error: any) {
        console.error('❌ Gemini config backend\'e kaydedilemedi:', error);
        
        // Fallback: localStorage'a kaydet (geçici)
        try {
          const currentConfig = await this.getConfig();
          const newConfig = { ...currentConfig, ...config };
          localStorage.setItem(this.CONFIG_KEY, JSON.stringify({
            enabled: newConfig.enabled,
            apiKey: newConfig.apiKey,
            model: newConfig.model,
            temperature: newConfig.temperature,
            maxTokens: newConfig.maxTokens
          }));
          console.warn('⚠️ Config localStorage\'a kaydedildi (fallback)');
        } catch (fallbackError) {
          console.error('❌ Config hiçbir yere kaydedilemedi:', fallbackError);
          throw new Error('Config kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.');
        }
      }
    } catch (error) {
      console.error('❌ Gemini config kaydedilemedi:', error);
      throw error;
    }
  }

  // Gemini API durumunu kontrol et (Next.js API route üzerinden)
  static async checkHealth(): Promise<{ status: 'online' | 'offline'; models?: string[] }> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiKey) {
        return { status: 'offline' };
      }

      // Eğer API key maskelenmiş görünüyorsa, Next.js API route'u backend'den çekecek
      const apiKeyToSend = (config.apiKey && !config.apiKey.includes('...') && config.apiKey.length > 20) 
        ? config.apiKey 
        : ''; // Next.js route backend'den çekecek

      // Next.js API route üzerinden kontrol et
      try {
        const response = await fetch('/api/gemini/health', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: apiKeyToSend,
            model: config.model
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        } else {
          return { status: 'offline' };
        }
      } catch (error: any) {
        console.log('🔄 Gemini API yanıt vermiyor:', error);
        return { status: 'offline' };
      }
    } catch (error) {
      console.error('❌ Gemini health check failed:', error);
      return { status: 'offline' };
    }
  }

  // Dosyayı base64'e çevir
  static async fileToBase64(file: File): Promise<{ mimeType: string; data: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          mimeType: file.type || 'application/octet-stream',
          data: base64
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Mesajları SDK formatına çevir
  private static convertMessagesToSDKFormat(messages: GeminiMessage[]): Array<{ role: string; parts: any[] }> {
    const contents: Array<{ role: string; parts: any[] }> = [];
    
    for (const msg of messages) {
      const parts: any[] = [];
      
      // Metin içeriği
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      
      // Dosya içeriği (eğer varsa)
      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.text) {
            parts.push({ text: part.text });
          } else if (part.inlineData) {
            parts.push({
              inlineData: {
                mimeType: part.inlineData.mimeType,
                data: part.inlineData.data
              }
            });
          }
        }
      }
      
      // Role'ü düzelt (assistant -> model)
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // Eğer parts boş değilse ekle
      if (parts.length > 0) {
        contents.push({
          role,
          parts
        });
      }
    }

    return contents;
  }

  // Gemini'ye mesaj gönder
  static async sendMessage(
    messages: GeminiMessage[], 
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      files?: File[];
    }
  ): Promise<GeminiResponse> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiKey) {
        throw new Error('Gemini is not enabled or API key is missing');
      }

      const modelName = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 8192;

      // Mesajları SDK formatına çevir
      let contents = this.convertMessagesToSDKFormat(messages);

      // Dosyaları ekle (eğer varsa)
      if (options?.files && options.files.length > 0) {
        const fileParts = await Promise.all(
          options.files.map(file => this.fileToBase64(file))
        );
        
        // Son kullanıcı mesajına dosyaları ekle
        if (contents.length > 0) {
          const lastContent = contents[contents.length - 1];
          if (lastContent.role === 'user') {
            lastContent.parts.push(
              ...fileParts.map(fp => ({
                inlineData: {
                  mimeType: fp.mimeType,
                  data: fp.data
                }
              }))
            );
          } else {
            // Eğer son mesaj model ise, yeni bir user mesajı ekle
            contents.push({
              role: 'user',
              parts: fileParts.map(fp => ({
                inlineData: {
                  mimeType: fp.mimeType,
                  data: fp.data
                }
              }))
            });
          }
        } else {
          // Hiç mesaj yoksa, sadece dosyalarla yeni bir mesaj ekle
          contents.push({
            role: 'user',
            parts: fileParts.map(fp => ({
              inlineData: {
                mimeType: fp.mimeType,
                data: fp.data
              }
            }))
          });
        }
      }

      // Eğer hiç içerik yoksa hata ver
      if (contents.length === 0) {
        throw new Error('Mesaj içeriği boş');
      }

      console.log('🤖 Gemini Request:', { 
        model: modelName, 
        temperature, 
        maxTokens,
        messageCount: contents.length
      });

      // Eğer API key maskelenmiş görünüyorsa, Next.js API route'u backend'den çekecek
      const apiKeyToSend = (config.apiKey && !config.apiKey.includes('...') && config.apiKey.length > 20) 
        ? config.apiKey 
        : ''; // Next.js route backend'den çekecek

      // Dosyaları base64'e çevir (eğer varsa)
      let fileData: any[] | undefined = undefined;
      if (options?.files && options.files.length > 0) {
        fileData = await Promise.all(
          options.files.map(file => this.fileToBase64(file))
        );
      }

      // Next.js API route üzerinden istek gönder
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`🔄 Gemini deneme ${attempt}/${MAX_RETRIES}...`);
          
          const response = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey: apiKeyToSend,
              model: modelName,
              messages: messages,
              temperature,
              maxTokens,
              files: fileData
            }),
            signal: AbortSignal.timeout(60000)
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Gemini Response:', data);
            return data;
          } else {
            const errorData = await response.json();
            const errorMessage = errorData.error || `HTTP ${response.status}`;
            
            console.error(`❌ Gemini API hata (${attempt}/${MAX_RETRIES}):`, response.status, errorData);
            
            lastError = new Error(errorMessage);
            
            // Rate limit için exponential backoff
            if (response.status === 429 && attempt < MAX_RETRIES) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
              console.log(`⏳ Rate limit nedeniyle ${waitTime}ms bekleniyor...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else if (response.status === 400 || response.status === 401 || response.status === 403) {
              // Bu hatalar için retry yapma
              break;
            }
          }
        } catch (error: any) {
          console.error(`❌ Gemini deneme ${attempt}/${MAX_RETRIES} başarısız:`, error);
          lastError = error instanceof Error ? error : new Error('Bilinmeyen hata');
          
          // Son deneme değilse kısa bekle
          if (attempt < MAX_RETRIES) {
            const waitTime = attempt * 1000; // 1s, 2s
            console.log(`⏳ ${waitTime}ms bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // Tüm denemeler başarısız
      throw lastError || new Error(`Gemini API ${MAX_RETRIES} deneme sonrası erişilemiyor`);
      
    } catch (error) {
      console.error('❌ Gemini sendMessage error:', error);
      throw error;
    }
  }

  // Streaming yanıt al
  static async sendMessageStream(
    messages: GeminiMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      files?: File[];
    }
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiKey) {
        throw new Error('Gemini is not enabled or API key is missing');
      }

      const modelName = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 8192;

      // Mesajları SDK formatına çevir
      let contents = this.convertMessagesToSDKFormat(messages);

      // Dosyaları ekle (eğer varsa)
      if (options?.files && options.files.length > 0) {
        const fileParts = await Promise.all(
          options.files.map(file => this.fileToBase64(file))
        );
        
        if (contents.length > 0) {
          const lastContent = contents[contents.length - 1];
          if (lastContent.role === 'user') {
            lastContent.parts.push(
              ...fileParts.map(fp => ({
                inlineData: {
                  mimeType: fp.mimeType,
                  data: fp.data
                }
              }))
            );
          } else {
            contents.push({
              role: 'user',
              parts: fileParts.map(fp => ({
                inlineData: {
                  mimeType: fp.mimeType,
                  data: fp.data
                }
              }))
            });
          }
        } else {
          contents.push({
            role: 'user',
            parts: fileParts.map(fp => ({
              inlineData: {
                mimeType: fp.mimeType,
                data: fp.data
              }
            }))
          });
        }
      }

      if (contents.length === 0) {
        throw new Error('Mesaj içeriği boş');
      }

      // Dosyaları base64'e çevir (eğer varsa)
      let fileData: any[] | undefined = undefined;
      if (options?.files && options.files.length > 0) {
        fileData = await Promise.all(
          options.files.map(file => this.fileToBase64(file))
        );
      }

      // Eğer API key maskelenmiş görünüyorsa, Next.js API route'u backend'den çekecek
      const apiKeyToSend = (config.apiKey && !config.apiKey.includes('...') && config.apiKey.length > 20) 
        ? config.apiKey 
        : ''; // Next.js route backend'den çekecek

      // Next.js API route üzerinden streaming
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKeyToSend,
          model: modelName,
          messages: messages,
          temperature,
          maxTokens,
          files: fileData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'chunk' && data.text) {
                onChunk(data.text);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              } else if (data.type === 'done') {
                return;
              }
            } catch (e) {
              // JSON parse hatası, devam et
              console.warn('Stream parse hatası:', e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Gemini streaming error:', error);
      throw error;
    }
  }

  // Mevcut modelleri listele
  static async getAvailableModels(): Promise<string[]> {
    try {
      const config = await this.getConfig();
      if (!config.apiKey) {
        return [];
      }

      // Varsayılan modelleri döndür
      // Not: Model listesi API'si için ayrı bir endpoint gerekebilir
      return ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    } catch (error) {
      console.error('❌ Gemini models alınamadı:', error);
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  // Session'ları listele
  static async getSessions(limit: number = 50, offset: number = 0): Promise<Array<{
    id: number;
    sessionId: string;
    title: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      if (typeof window === 'undefined') return [];
      
      const response = await api.get<{ success: boolean; sessions: any[] }>('/admin/gemini/sessions', {
        limit,
        offset
      });
      
      if (response.success && response.sessions) {
        return response.sessions;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Gemini sessions alınamadı:', error);
      return [];
    }
  }

  // Belirli bir session'ı getir
  static async getSession(sessionId: string): Promise<{
    id: number;
    sessionId: string;
    title: string;
    messages: GeminiMessage[];
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  } | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      const response = await api.get<{ success: boolean; session: any }>(`/admin/gemini/sessions/${sessionId}`);
      
      if (response.success && response.session) {
        return response.session;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Gemini session alınamadı:', error);
      return null;
    }
  }

  // Session'ı kaydet veya güncelle
  static async saveSession(sessionId: string, title: string, messages: GeminiMessage[]): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      const response = await api.post<{ success: boolean }>('/admin/gemini/sessions', {
        sessionId,
        title,
        messages
      });
      
      if (response.success) {
        console.log('✅ Gemini session kaydedildi:', sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Gemini session kaydedilemedi:', error);
      return false;
    }
  }

  // Session mesajlarını güncelle
  static async updateSessionMessages(sessionId: string, messages: GeminiMessage[]): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      const response = await api.put<{ success: boolean }>(`/admin/gemini/sessions/${sessionId}/messages`, {
        messages
      });
      
      if (response.success) {
        console.log('✅ Gemini session mesajları güncellendi:', sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Gemini session mesajları güncellenemedi:', error);
      return false;
    }
  }

  // Session'ı sil
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      const response = await api.delete<{ success: boolean }>(`/admin/gemini/sessions/${sessionId}`);
      
      if (response.success) {
        console.log('✅ Gemini session silindi:', sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Gemini session silinemedi:', error);
      return false;
    }
  }
}
