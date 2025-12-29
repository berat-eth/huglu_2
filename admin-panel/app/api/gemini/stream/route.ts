import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, model, messages, temperature, maxTokens, files } = body;

    // Validasyon
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
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

