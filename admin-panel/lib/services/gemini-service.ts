// Gemini AI Service - Next.js API route'ları üzerinden SDK kullanarak
// Not: CSP kuralları nedeniyle SDK server-side'da çalışıyor

export interface GeminiConfig {
  enabled: boolean;
  apiKey: string;
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
  private static readonly CONFIG_KEY = 'gemini_config';
  private static readonly DEFAULT_CONFIG: GeminiConfig = {
    enabled: true,
    apiKey: '',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 8192
  };

  // Not: SDK artık server-side'da çalışıyor (Next.js API route'ları üzerinden)

  // Konfigürasyonu al
  static async getConfig(): Promise<GeminiConfig> {
    try {
      if (typeof window === 'undefined') return this.DEFAULT_CONFIG;
      
      // Önce localStorage'dan dene
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
      
      // localStorage'da yoksa sessionStorage'dan dene
      const sessionStored = sessionStorage.getItem(this.CONFIG_KEY);
      if (sessionStored) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(sessionStored) };
      }
      
      return this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('❌ Gemini config alınamadı:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  // Konfigürasyonu kaydet
  static async saveConfig(config: Partial<GeminiConfig>): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      
      // Sadece gerekli verileri sakla (localStorage quota için)
      const configToSave = {
        enabled: newConfig.enabled,
        apiKey: newConfig.apiKey,
        model: newConfig.model,
        temperature: newConfig.temperature,
        maxTokens: newConfig.maxTokens
      };
      
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configToSave));
      console.log('✅ Gemini config kaydedildi:', { ...configToSave, apiKey: configToSave.apiKey ? '***' : '' });
    } catch (error: any) {
      // QuotaExceededError durumunda localStorage'ı temizle ve tekrar dene
      if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
        console.warn('⚠️ localStorage quota aşıldı, temizleniyor...');
        try {
          // Sadece gemini_config'i temizle, diğer önemli verileri koru
          this.clearOldData();
          
          // Tekrar kaydetmeyi dene
          const currentConfig = await this.getConfig();
          const newConfig = { ...currentConfig, ...config };
          const configToSave = {
            enabled: newConfig.enabled,
            apiKey: newConfig.apiKey,
            model: newConfig.model,
            temperature: newConfig.temperature,
            maxTokens: newConfig.maxTokens
          };
          
          localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configToSave));
          console.log('✅ Gemini config temizleme sonrası kaydedildi');
        } catch (retryError) {
          console.error('❌ Gemini config kaydedilemedi (temizleme sonrası):', retryError);
          // Son çare: sessionStorage kullan
          try {
            const fallbackConfig = await this.getConfig();
            sessionStorage.setItem(this.CONFIG_KEY, JSON.stringify({
              enabled: config.enabled ?? fallbackConfig.enabled,
              apiKey: config.apiKey ?? fallbackConfig.apiKey,
              model: config.model ?? fallbackConfig.model,
              temperature: config.temperature ?? fallbackConfig.temperature,
              maxTokens: config.maxTokens ?? fallbackConfig.maxTokens
            }));
            console.log('✅ Gemini config sessionStorage\'a kaydedildi');
          } catch (sessionError) {
            console.error('❌ sessionStorage\'a da kaydedilemedi:', sessionError);
            throw new Error('Config kaydedilemedi. Lütfen tarayıcı ayarlarını kontrol edin.');
          }
        }
      } else {
        console.error('❌ Gemini config kaydedilemedi:', error);
        throw error;
      }
    }
  }

  // Eski/büyük verileri temizle
  private static clearOldData(): void {
    try {
      if (typeof window === 'undefined') return;
      
      // localStorage'daki tüm key'leri kontrol et
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToCheck.push(key);
        }
      }
      
      // Büyük verileri temizle (gemini_config hariç)
      keysToCheck.forEach(key => {
        if (key !== this.CONFIG_KEY && key.startsWith('gemini_')) {
          try {
            const value = localStorage.getItem(key);
            if (value && value.length > 10000) { // 10KB'dan büyük veriler
              console.log(`🗑️ Büyük veri temizleniyor: ${key} (${value.length} bytes)`);
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Hata durumunda devam et
          }
        }
      });
    } catch (error) {
      console.error('❌ Eski veriler temizlenirken hata:', error);
    }
  }

  // Gemini API durumunu kontrol et (Next.js API route üzerinden)
  static async checkHealth(): Promise<{ status: 'online' | 'offline'; models?: string[] }> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiKey) {
        return { status: 'offline' };
      }

      // Next.js API route üzerinden kontrol et
      try {
        const response = await fetch('/api/gemini/health', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: config.apiKey,
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
              apiKey: config.apiKey,
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

      // Next.js API route üzerinden streaming
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config.apiKey,
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
}
