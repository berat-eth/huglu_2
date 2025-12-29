import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, model } = body;

    if (!apiKey) {
      return NextResponse.json(
        { status: 'offline', error: 'API key is required' },
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

