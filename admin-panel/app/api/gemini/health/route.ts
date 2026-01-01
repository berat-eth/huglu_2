import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Backend'den API key'i çek
async function getApiKeyFromBackend(): Promise<string | null> {
  try {
    // Development ortamında localhost, production'da production URL
    const isDevelopment = process.env.NODE_ENV === 'development';
    const API_BASE_URL = isDevelopment 
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
      : (process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api');
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
    const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';
    
    const url = `${API_BASE_URL}/admin/gemini/config/raw`;
    console.log('🔑 Backend\'den API key çekiliyor:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Admin-Key': ADMIN_KEY,
      },
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
      console.error('❌ API key alınamadı, status:', response.status, errorText);
    }
  } catch (error: any) {
    console.error('❌ Backend\'den API key alınamadı:', error.message || error);
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
    
    let { apiKey, model } = body;

    console.log('🔍 Health check isteği alındı, apiKey uzunluğu:', apiKey ? apiKey.length : 0);

    // Eğer API key maskelenmiş görünüyorsa veya boşsa, backend'den çek
    if (!apiKey || apiKey.includes('...') || apiKey.length < 20) {
      console.log('🔑 API key backend\'den çekiliyor...');
      const backendApiKey = await getApiKeyFromBackend();
      if (backendApiKey) {
        console.log('✅ Backend\'den API key alındı, uzunluk:', backendApiKey.length);
        apiKey = backendApiKey;
      } else {
        console.error('❌ Backend\'den API key alınamadı');
      }
    }

    if (!apiKey || apiKey.length < 20) {
      console.error('❌ API key geçersiz veya eksik, uzunluk:', apiKey ? apiKey.length : 0);
      return NextResponse.json(
        { status: 'offline', error: 'API key is required and must be valid' },
        { status: 400 }
      );
    }

    // Basit bir test isteği gönder - gemini-2.5-flash kullan
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      generationConfig: {
        maxOutputTokens: 1
      }
    });

    await result.response;

    return NextResponse.json({
      status: 'online',
      models: ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
    });

  } catch (error: any) {
    console.error('❌ Gemini health check error:', error);
    return NextResponse.json({
      status: 'offline',
      error: error.message || 'Health check failed'
    });
  }
}

