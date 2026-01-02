/**
 * Gemini API Service
 * Rate limiting, caching ve retry mekanizması ile optimize edilmiş servis
 * 
 * Gemini API Rate Limits (gemini-2.5-flash için):
 * - RPM (Requests Per Minute): 20 (free tier)
 * - TPM (Tokens Per Minute - input): 32,000 (free tier)
 * - RPD (Requests Per Day): 1,500 (free tier)
 * 
 * Rate limitler proje başına uygulanır, API key başına değil
 * RPD kotaları Pasifik saatine göre gece yarısında sıfırlanır
 */

const crypto = require('crypto');
const axios = require('axios');

class GeminiService {
  constructor(poolWrapper) {
    this.poolWrapper = poolWrapper;
    
    // ==================== RPM (Requests Per Minute) ====================
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.windowSize = 60000; // 1 dakika
    this.maxRequestsPerMinute = 15; // Free tier için güvenli limit (20'den 15'e düşürüldü)
    
    // ==================== TPM (Tokens Per Minute - Input) ====================
    this.tokenCount = 0;
    this.tokenWindowStart = Date.now();
    this.maxTokensPerMinute = 28000; // Free tier için güvenli limit (32,000'den 28,000'e düşürüldü)
    
    // ==================== RPD (Requests Per Day) ====================
    this.dailyRequestCount = 0;
    this.dailyWindowStart = this.getPacificMidnight(); // Pasifik saatine göre gece yarısı
    
    // Free tier için günlük limit (1,500'den 1,200'e düşürüldü - güvenli marj)
    this.maxRequestsPerDay = 1200;
    
    // Response cache (benzer sorular için)
    this.responseCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 dakika
    
    // Retry mekanizması
    this.retryDelays = [1000, 2000, 5000]; // 1s, 2s, 5s
    
    // Request queue (rate limit aşıldığında bekleyen istekler)
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Pasifik saatine göre gece yarısını hesapla
   * RPD kotaları Pasifik saatine göre gece yarısında sıfırlanır
   */
  getPacificMidnight() {
    const now = new Date();
    // Pasifik saati (UTC-8 veya UTC-7 - DST'ye göre)
    // Basitleştirme: UTC-8 kullanıyoruz (PST)
    const pacificOffset = -8 * 60; // UTC-8 in minutes
    const pacificTime = new Date(now.getTime() + (pacificOffset * 60 * 1000));
    
    // Bugünün gece yarısı (Pasifik saatine göre)
    pacificTime.setHours(0, 0, 0, 0);
    
    // UTC'ye geri çevir
    return new Date(pacificTime.getTime() - (pacificOffset * 60 * 1000));
  }

  /**
   * Metindeki token sayısını tahmin et (yaklaşık)
   * Gemini API için: ~4 karakter = 1 token (Türkçe için)
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    // Türkçe için yaklaşık: 1 token = 4 karakter
    // İngilizce için: 1 token = 4 karakter
    // Güvenli tahmin için 3.5 karakter/token kullanıyoruz
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Mesaj için cache key oluştur
   */
  getCacheKey(message, productId, userId) {
    const normalizedMessage = message.toLowerCase().trim();
    const key = `${normalizedMessage}:${productId || 'none'}:${userId || 'none'}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Cache'den yanıt al
   */
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.response;
    }
    // Expired cache'i temizle
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Cache'e yanıt kaydet
   */
  setCachedResponse(cacheKey, response) {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    // Cache boyutunu kontrol et (max 1000 entry)
    if (this.responseCache.size > 1000) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
  }

  /**
   * Tüm rate limitleri kontrol et (RPM, TPM, RPD)
   */
  async checkAllRateLimits(inputText) {
    const now = Date.now();
    
    // ==================== RPM (Requests Per Minute) Kontrolü ====================
    if (now - this.windowStart >= this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.windowSize - (now - this.windowStart);
      if (waitTime > 0) {
        console.log(`⏳ Gemini API RPM limit: ${waitTime}ms bekleniyor... (${this.requestCount}/${this.maxRequestsPerMinute})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    // ==================== TPM (Tokens Per Minute) Kontrolü ====================
    const estimatedTokens = this.estimateTokenCount(inputText);
    
    if (now - this.tokenWindowStart >= this.windowSize) {
      this.tokenCount = 0;
      this.tokenWindowStart = now;
    }
    
    if (this.tokenCount + estimatedTokens > this.maxTokensPerMinute) {
      const waitTime = this.windowSize - (now - this.tokenWindowStart);
      if (waitTime > 0) {
        console.log(`⏳ Gemini API TPM limit: ${waitTime}ms bekleniyor... (${this.tokenCount + estimatedTokens}/${this.maxTokensPerMinute} tokens)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.tokenCount = 0;
        this.tokenWindowStart = Date.now();
      }
    }
    
    // ==================== RPD (Requests Per Day) Kontrolü ====================
    const pacificMidnight = this.getPacificMidnight();
    const timeSinceMidnight = now - pacificMidnight.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Eğer yeni bir gün başladıysa sıfırla
    if (timeSinceMidnight >= oneDay || timeSinceMidnight < 0) {
      this.dailyRequestCount = 0;
      this.dailyWindowStart = pacificMidnight;
      console.log('🔄 Gemini API günlük limit sıfırlandı (Pasifik saati gece yarısı)');
    }
    
    if (this.dailyRequestCount >= this.maxRequestsPerDay) {
      const nextMidnight = new Date(pacificMidnight);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      const waitTime = nextMidnight.getTime() - now;
      
      if (waitTime > 0) {
        const waitHours = Math.ceil(waitTime / (60 * 60 * 1000));
        throw new Error(`Günlük istek limiti aşıldı (${this.dailyRequestCount}/${this.maxRequestsPerDay}). Lütfen ${waitHours} saat sonra tekrar deneyin.`);
      }
    }
    
    // Limitler aşılmadıysa sayacları artır
    this.requestCount++;
    this.tokenCount += estimatedTokens;
    this.dailyRequestCount++;
    
    // Log (her 10 istekte bir)
    if (this.requestCount % 10 === 0 || this.dailyRequestCount % 100 === 0) {
      console.log(`📊 Gemini API kullanımı - RPM: ${this.requestCount}/${this.maxRequestsPerMinute}, TPM: ${this.tokenCount}/${this.maxTokensPerMinute}, RPD: ${this.dailyRequestCount}/${this.maxRequestsPerDay}`);
    }
  }

  /**
   * Retry mekanizması ile API çağrısı
   */
  async callGeminiAPI(url, payload, headers, inputText, retryCount = 0) {
    try {
      // Tüm rate limitleri kontrol et
      await this.checkAllRateLimits(inputText);
      
      const response = await axios.post(url, payload, {
        headers,
        timeout: 30000
      });
      
      return response;
    } catch (error) {
      // Rate limit hatası değilse direkt fırlat
      if (error.message && error.message.includes('Günlük istek limiti')) {
        throw error;
      }
      // 429 (Rate Limit) hatası için retry
      if (error.response?.status === 429 && retryCount < this.retryDelays.length) {
        const retryAfter = error.response?.data?.error?.message?.match(/retry in (\d+\.?\d*)s/i);
        const waitTime = retryAfter 
          ? Math.ceil(parseFloat(retryAfter[1]) * 1000)
          : this.retryDelays[retryCount];
        
        console.warn(`⚠️ Gemini API rate limit (429), ${waitTime}ms sonra tekrar deneniyor... (${retryCount + 1}/${this.retryDelays.length})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.callGeminiAPI(url, payload, headers, retryCount + 1);
      }
      
      // Diğer hatalar için de retry (sadece network hataları)
      if (retryCount < this.retryDelays.length && 
          (!error.response || (error.response.status >= 500 && error.response.status < 600))) {
        const waitTime = this.retryDelays[retryCount];
        console.warn(`⚠️ Gemini API hatası, ${waitTime}ms sonra tekrar deneniyor... (${retryCount + 1}/${this.retryDelays.length})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.callGeminiAPI(url, payload, headers, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Gemini API'ye mesaj gönder (cache ve rate limiting ile)
   */
  async sendMessage(message, productContext = '', userContext = '', systemPrompt = '', productId = null, userId = null) {
    try {
      // Cache kontrolü
      const cacheKey = this.getCacheKey(message, productId, userId);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('✅ Gemini API cache hit');
        return cachedResponse;
      }

      // Gemini config'i veritabanından al
      const [geminiConfigs] = await this.poolWrapper.execute(`
        SELECT id, enabled, apiKey, model, temperature, maxTokens
        FROM gemini_config
        WHERE enabled = 1
        ORDER BY id ASC
        LIMIT 1
      `);

      if (!geminiConfigs || geminiConfigs.length === 0 || !geminiConfigs[0].apiKey || !geminiConfigs[0].apiKey.trim()) {
        throw new Error('Gemini API key not configured');
      }

      const config = geminiConfigs[0];
      let modelName = config.model || 'gemini-2.5-flash';
      
      // Eski modelleri yeni modele dönüştür
      const oldModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro-latest', 'gemini-pro', 'gemini-1.5-pro'];
      if (oldModels.includes(modelName)) {
        modelName = 'gemini-2.5-flash';
      }
      
      if (!modelName || modelName.trim() === '') {
        modelName = 'gemini-2.5-flash';
      }

      const temperature = parseFloat(config.temperature) || 0.70;
      const maxTokens = parseInt(config.maxTokens) || 8192;

      // API çağrısı
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
      
      const fullInputText = `${systemPrompt}\n\nMüşteri Sorusu: ${message}${productContext}${userContext}`;
      
      const payload = {
        contents: [{
          role: 'user',
          parts: [{ text: fullInputText }]
        }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey
      };

      const estimatedTokens = this.estimateTokenCount(fullInputText);
      
      console.log('🤖 Gemini API çağrısı:', { 
        modelName, 
        hasApiKey: !!config.apiKey,
        cacheKey: cacheKey.substring(0, 8) + '...',
        estimatedTokens,
        currentRPM: this.requestCount,
        currentTPM: this.tokenCount,
        currentRPD: this.dailyRequestCount
      });

      const response = await this.callGeminiAPI(url, payload, headers, fullInputText);
      const geminiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (geminiResponse && geminiResponse.trim()) {
        const result = {
          text: geminiResponse.trim(),
          cached: false
        };
        
        // Cache'e kaydet
        this.setCachedResponse(cacheKey, result);
        result.cached = false; // İlk çağrı cache'den gelmedi
        
        return result;
      }

      throw new Error('Empty response from Gemini API');
    } catch (error) {
      console.error('❌ Gemini API hatası:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Cache'i temizle
   */
  clearCache() {
    this.responseCache.clear();
    console.log('✅ Gemini cache temizlendi');
  }

  /**
   * Rate limit istatistikleri
   */
  getStats() {
    const pacificMidnight = this.getPacificMidnight();
    const timeSinceMidnight = Date.now() - pacificMidnight.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const timeUntilReset = oneDay - timeSinceMidnight;
    const hoursUntilReset = Math.floor(timeUntilReset / (60 * 60 * 1000));
    const minutesUntilReset = Math.floor((timeUntilReset % (60 * 60 * 1000)) / (60 * 1000));
    
    return {
      // RPM (Requests Per Minute)
      rpm: {
        current: this.requestCount,
        max: this.maxRequestsPerMinute,
        windowStart: this.windowStart,
        windowSize: this.windowSize
      },
      // TPM (Tokens Per Minute)
      tpm: {
        current: this.tokenCount,
        max: this.maxTokensPerMinute,
        windowStart: this.tokenWindowStart,
        windowSize: this.windowSize
      },
      // RPD (Requests Per Day)
      rpd: {
        current: this.dailyRequestCount,
        max: this.maxRequestsPerDay,
        windowStart: this.dailyWindowStart,
        resetIn: `${hoursUntilReset}h ${minutesUntilReset}m`,
        pacificMidnight: pacificMidnight.toISOString()
      },
      // Cache
      cache: {
        size: this.responseCache.size,
        ttl: this.cacheTTL
      }
    };
  }
}

// Singleton instance
let geminiServiceInstance = null;

/**
 * Gemini servisini al veya oluştur
 */
function getGeminiService(poolWrapper) {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService(poolWrapper);
  }
  return geminiServiceInstance;
}

module.exports = {
  GeminiService,
  getGeminiService
};

