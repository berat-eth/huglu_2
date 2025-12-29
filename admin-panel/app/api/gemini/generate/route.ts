import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, model, messages, temperature, maxTokens, files } = body;

    // Validasyon
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
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

    // Gemini'ye istek gönder
    const result = await geminiModel.generateContent({
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
    return NextResponse.json({
      candidates: [{
        content: {
          parts: [{ text }],
          role: 'model'
        }
      }]
    });

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

