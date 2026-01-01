import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const url = `${API_BASE_URL}/admin/gemini/config/raw`;
    console.log('🔑 Backend\'den API key çekiliyor:', url);
    console.log('🔑 API_BASE_URL:', API_BASE_URL);
    console.log('🔑 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔑 isDevelopment:', isDevelopment);
    
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
      console.error('❌ API key alınamadı, status:', response.status, errorText.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Backend\'den API key alınamadı:', error?.message || error);
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
      return new Response(
        JSON.stringify({ error: 'API key is required and must be valid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      
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
      }
    }

    if (contents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid content found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Streaming için ReadableStream oluştur
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await geminiModel.generateContentStream({
            contents: contents as any,
            generationConfig: {
              temperature: temperature || 0.7,
              maxOutputTokens: maxTokens || 8192,
              topP: 0.95,
              topK: 40
            }
          });

          // Stream'i oku ve gönder
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              const data = JSON.stringify({
                type: 'chunk',
                text: chunkText
              }) + '\n';
              controller.enqueue(new TextEncoder().encode(data));
            }
          }

          // Stream tamamlandı
          controller.enqueue(new TextEncoder().encode(
            JSON.stringify({ type: 'done' }) + '\n'
          ));
          controller.close();
        } catch (error: any) {
          controller.enqueue(new TextEncoder().encode(
            JSON.stringify({ 
              type: 'error', 
              error: error.message || 'Stream error' 
            }) + '\n'
          ));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('❌ Gemini stream error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Stream error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

