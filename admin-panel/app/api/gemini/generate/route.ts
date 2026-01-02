import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// ==================== RPM (Requests Per Minute) ====================
let requestCount = 0;
let windowStart = Date.now();
const windowSize = 60000; // 1 dakika
const maxRequestsPerMinute = 15; // Free tier için güvenli limit (20'den 15'e düşürüldü)

// ==================== TPM (Tokens Per Minute - Input) ====================
let tokenCount = 0;
let tokenWindowStart = Date.now();
const maxTokensPerMinute = 28000; // Free tier için güvenli limit (32,000'den 28,000'e düşürüldü)

// ==================== RPD (Requests Per Day) ====================
let dailyRequestCount = 0;
let dailyWindowStart = getPacificMidnight(); // Pasifik saatine göre gece yarısı
const maxRequestsPerDay = 1200; // Free tier için günlük limit (1,500'den 1,200'e düşürüldü)

// Response cache (benzer sorular için)
const responseCache = new Map<string, { response: any; timestamp: number }>();
const cacheTTL = 5 * 60 * 1000; // 5 dakika

/**
 * Pasifik saatine göre gece yarısını hesapla
 * RPD kotaları Pasifik saatine göre gece yarısında sıfırlanır
 */
function getPacificMidnight(): Date {
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
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Türkçe için yaklaşık: 1 token = 4 karakter
  // Güvenli tahmin için 3.5 karakter/token kullanıyoruz
  return Math.ceil(text.length / 3.5);
}

// Cache key oluştur
function getCacheKey(messages: any[]): string {
  const messageText = messages.map(m => m.content || '').join('|');
  return crypto.createHash('md5').update(messageText).digest('hex');
}

// Cache'den yanıt al
function getCachedResponse(cacheKey: string): any | null {
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey);
  }
  return null;
}

// Cache'e yanıt kaydet
function setCachedResponse(cacheKey: string, response: any): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  
  // Cache boyutunu kontrol et (max 1000 entry)
  if (responseCache.size > 1000) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// Tüm rate limitleri kontrol et (RPM, TPM, RPD)
async function checkAllRateLimits(inputText: string): Promise<void> {
  const now = Date.now();
  
  // ==================== RPM (Requests Per Minute) Kontrolü ====================
  if (now - windowStart >= windowSize) {
    requestCount = 0;
    windowStart = now;
  }
  
  if (requestCount >= maxRequestsPerMinute) {
    const waitTime = windowSize - (now - windowStart);
    if (waitTime > 0) {
      console.log(`⏳ Gemini API RPM limit: ${waitTime}ms bekleniyor... (${requestCount}/${maxRequestsPerMinute})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      requestCount = 0;
      windowStart = Date.now();
    }
  }
  
  // ==================== TPM (Tokens Per Minute) Kontrolü ====================
  const estimatedTokens = estimateTokenCount(inputText);
  
  if (now - tokenWindowStart >= windowSize) {
    tokenCount = 0;
    tokenWindowStart = now;
  }
  
  if (tokenCount + estimatedTokens > maxTokensPerMinute) {
    const waitTime = windowSize - (now - tokenWindowStart);
    if (waitTime > 0) {
      console.log(`⏳ Gemini API TPM limit: ${waitTime}ms bekleniyor... (${tokenCount + estimatedTokens}/${maxTokensPerMinute} tokens)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      tokenCount = 0;
      tokenWindowStart = Date.now();
    }
  }
  
  // ==================== RPD (Requests Per Day) Kontrolü ====================
  const pacificMidnight = getPacificMidnight();
  const timeSinceMidnight = now - pacificMidnight.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Eğer yeni bir gün başladıysa sıfırla
  if (timeSinceMidnight >= oneDay || timeSinceMidnight < 0) {
    dailyRequestCount = 0;
    dailyWindowStart = pacificMidnight;
    console.log('🔄 Gemini API günlük limit sıfırlandı (Pasifik saati gece yarısı)');
  }
  
  if (dailyRequestCount >= maxRequestsPerDay) {
    const nextMidnight = new Date(pacificMidnight);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    const waitTime = nextMidnight.getTime() - now;
    
    if (waitTime > 0) {
      const waitHours = Math.ceil(waitTime / (60 * 60 * 1000));
      throw new Error(`Günlük istek limiti aşıldı (${dailyRequestCount}/${maxRequestsPerDay}). Lütfen ${waitHours} saat sonra tekrar deneyin.`);
    }
  }
  
  // Limitler aşılmadıysa sayacları artır
  requestCount++;
  tokenCount += estimatedTokens;
  dailyRequestCount++;
  
  // Log (her 10 istekte bir)
  if (requestCount % 10 === 0 || dailyRequestCount % 100 === 0) {
    console.log(`📊 Gemini API kullanımı - RPM: ${requestCount}/${maxRequestsPerMinute}, TPM: ${tokenCount}/${maxTokensPerMinute}, RPD: ${dailyRequestCount}/${maxRequestsPerDay}`);
  }
}

// Backend'den API key'i çek
async function getApiKeyFromBackend(): Promise<string | null> {
  try {
    // Development ortamında localhost, production'da production URL
    // Next.js API route'ları server-side'da çalıştığı için NODE_ENV kullanabiliriz
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Backend URL'ini direkt kullan, Next.js API route'u değil
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (isDevelopment 
      ? 'http://localhost:3001/api'
      : 'https://api.huglutekstil.com/api');
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
    const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';
    
    // Backend URL'ini direkt kullan (Next.js API route değil)
    // Next.js server-side fetch'i bazen kendi routing'ine gidebiliyor, bu yüzden mutlak URL kullanıyoruz
    const url = `${API_BASE_URL}/admin/gemini/config/raw`;
    console.log('🔑 Backend\'den API key çekiliyor:', url);
    console.log('🔑 API_BASE_URL:', API_BASE_URL);
    console.log('🔑 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔑 isDevelopment:', isDevelopment);
    
    // Next.js server-side fetch'i kullanırken, mutlak URL ve agent gerekiyor
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Admin-Key': ADMIN_KEY,
      },
      // Next.js'in fetch caching'ini devre dışı bırak
      cache: 'no-store',
    });

    console.log('🔑 Backend response status:', response.status);
    console.log('🔑 Backend response URL:', response.url);

    if (response.ok) {
      const data = await response.json();
      console.log('🔑 Backend response data:', { success: data.success, hasApiKey: !!data.apiKey });
      if (data.success && data.apiKey) {
        console.log('✅ API key backend\'den başarıyla alındı');
        return data.apiKey;
      } else {
        console.error('❌ API key response formatı hatalı:', data);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API key alınamadı, status:', response.status);
      console.error('❌ Error response (first 500 chars):', errorText.substring(0, 500));
    }
  } catch (error: any) {
    console.error('❌ Backend\'den API key alınamadı:', error?.message || error);
    if (error?.code) {
      console.error('❌ Error code:', error.code);
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Request body'yi güvenli şekilde parse et
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.warn('⚠️ Request body parse edilemedi, boş body kullanılıyor:', parseError);
      body = {};
    }
    
    let { apiKey, model, messages, temperature, maxTokens, files } = body;

    // Eğer API key maskelenmiş görünüyorsa veya boşsa, backend'den çek
    if (!apiKey || apiKey.includes('...') || apiKey.length < 20) {
      const backendApiKey = await getApiKeyFromBackend();
      if (backendApiKey) {
        apiKey = backendApiKey;
      }
    }

    // Validasyon
    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json(
        { error: 'API key is required and must be valid' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Gemini SDK'yı başlat
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model adını düzelt
    let modelName = model || 'gemini-2.5-flash';
    
    // Desteklenen modeller
    const supportedModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    
    // Eğer model desteklenmiyorsa, varsayılan modeli kullan
    if (!supportedModels.includes(modelName)) {
      modelName = 'gemini-2.5-flash';
    }
    
    const geminiModel = genAI.getGenerativeModel({ 
      model: modelName
    });

    // Mesajları SDK formatına çevir
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
      
      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    // Dosyaları ekle (eğer varsa)
    if (files && Array.isArray(files) && files.length > 0) {
      if (contents.length > 0) {
        const lastContent = contents[contents.length - 1];
        if (lastContent.role === 'user') {
          lastContent.parts.push(
            ...files.map((file: any) => ({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data
              }
            }))
          );
        } else {
          contents.push({
            role: 'user',
            parts: files.map((file: any) => ({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data
              }
            }))
          });
        }
      } else {
        contents.push({
          role: 'user',
          parts: files.map((file: any) => ({
            inlineData: {
              mimeType: file.mimeType,
              data: file.data
            }
          }))
        });
      }
    }

    if (contents.length === 0) {
      return NextResponse.json(
        { error: 'No valid content found' },
        { status: 400 }
      );
    }

    // Cache kontrolü
    const cacheKey = getCacheKey(messages);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('✅ Gemini API cache hit');
      return NextResponse.json(cachedResponse);
    }

    // Tüm rate limitleri kontrol et
    const fullInputText = JSON.stringify(contents);
    await checkAllRateLimits(fullInputText);

    // Gemini'ye istek gönder (retry mekanizması ile)
    let result;
    let lastError: any = null;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 5000]; // 1s, 2s, 5s
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await geminiModel.generateContent({
          contents: contents as any,
          generationConfig: {
            temperature: temperature || 0.7,
            maxOutputTokens: maxTokens || 8192,
            topP: 0.95,
            topK: 40
          }
        });
        
        const response = await result.response;
        const text = response.text();

        // REST API formatına çevir (geriye uyumluluk için)
        const apiResponse = {
          candidates: [{
            content: {
              parts: [{ text }],
              role: 'model'
            }
          }]
        };
        
        // Cache'e kaydet
        setCachedResponse(cacheKey, apiResponse);
        
        return NextResponse.json(apiResponse);
      } catch (error: any) {
        lastError = error;
        
        // 429 (Rate Limit) hatası için retry
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          if (attempt < maxRetries) {
            const retryAfter = error.message?.match(/retry in (\d+\.?\d*)s/i);
            const waitTime = retryAfter 
              ? Math.ceil(parseFloat(retryAfter[1]) * 1000)
              : retryDelays[attempt - 1];
            
            console.warn(`⚠️ Gemini API rate limit (429), ${waitTime}ms sonra tekrar deneniyor... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // Diğer hatalar için de retry (sadece network hataları)
        if (attempt < maxRetries && (!error.message?.includes('400') && !error.message?.includes('401') && !error.message?.includes('403'))) {
          const waitTime = retryDelays[attempt - 1];
          console.warn(`⚠️ Gemini API hatası, ${waitTime}ms sonra tekrar deneniyor... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw error;
      }
    }
    
    // Tüm denemeler başarısız
    throw lastError || new Error('Gemini API erişilemiyor');

  } catch (error: any) {
    console.error('❌ Gemini API route error:', error);
    
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;

    // Hata kodlarına göre status code belirle
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
      statusCode = 401;
      errorMessage = 'API key geçersiz. Lütfen API key\'inizi kontrol edin.';
    } else if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
      statusCode = 403;
      errorMessage = 'Erişim reddedildi. API key yetkilerinizi kontrol edin.';
    } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
      statusCode = 429;
      errorMessage = 'Rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.';
    } else if (errorMessage.includes('INVALID_ARGUMENT') || errorMessage.includes('400')) {
      statusCode = 400;
      errorMessage = `Geçersiz istek: ${errorMessage}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

