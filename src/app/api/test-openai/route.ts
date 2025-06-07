// src/app/api/test-openai/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    console.log('🔍 Testing OpenAI connection...');
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not found in environment variables'
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Test simple avec GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant test. Réponds simplement 'Test réussi!' si tu reçois ce message."
        },
        {
          role: "user", 
          content: "Test de connexion"
        }
      ],
      max_tokens: 50,
      temperature: 0
    });

    console.log('✅ OpenAI test successful:', completion.choices[0]?.message?.content);

    return NextResponse.json({
      success: true,
      message: completion.choices[0]?.message?.content,
      model: "gpt-4o",
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('❌ OpenAI test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      type: error.type || 'unknown_error',
      code: error.code || 'unknown_code'
    }, { status: 500 });
  }
}