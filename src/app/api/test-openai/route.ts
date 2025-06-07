// src/app/api/test-openai/route.ts - ROUTE DE TEST
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing OpenAI connection...');
    
    // Vérifier que la clé API est présente
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 API Key status:', apiKey ? 'Present' : 'Missing');
    console.log('🔑 API Key prefix:', apiKey ? apiKey.substring(0, 20) + '...' : 'None');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Initialiser OpenAI
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log('🤖 OpenAI client initialized, testing connection...');

    // Test simple avec un message court
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu es Rose, vendeuse de jeux de cartes. Réponds brièvement."
        },
        {
          role: "user",
          content: "Dis juste 'Bonjour, je suis Rose !'"
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    console.log('✅ OpenAI response received:', completion.choices[0]?.message);

    return NextResponse.json({
      success: true,
      response: completion.choices[0]?.message?.content,
      usage: completion.usage,
      model: completion.model
    });

  } catch (error) {
    console.error('❌ OpenAI Test Error:', error);
    
    let errorMessage = 'Unknown error';
    let errorCode = 'UNKNOWN';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Analyser les types d'erreurs OpenAI
      if (error.message.includes('API key')) {
        errorCode = 'INVALID_API_KEY';
      } else if (error.message.includes('quota')) {
        errorCode = 'QUOTA_EXCEEDED';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorCode = 'NETWORK_ERROR';
      } else if (error.message.includes('timeout')) {
        errorCode = 'TIMEOUT';
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        errorCode,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'OpenAI Test Endpoint - Use POST to test the connection' 
  });
}