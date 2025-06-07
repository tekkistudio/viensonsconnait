// src/app/api/test-chat/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, productId } = await req.json();
    
    console.log('🧪 Testing chat with:', { message, productId });

    // Test avec le vrai endpoint
    const chatResponse = await fetch(new URL('/api/chat', req.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message || "Est-ce que le jeu fonctionne vraiment ?",
        productId: productId || "9657fe13-1686-4453-88e4-af4449b3e2ef",
        currentStep: "initial",
        sessionId: "test_session_" + Date.now(),
        storeId: "a9563f88-217c-4998-b080-ed39f637ea31"
      }),
    });

    const result = await chatResponse.json();
    
    return NextResponse.json({
      success: true,
      testMessage: message || "Est-ce que le jeu fonctionne vraiment ?",
      chatResponse: result,
      status: chatResponse.status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Chat test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Route de test du chat IA",
    usage: "POST avec { message: 'votre question', productId: 'id_produit' }",
    examples: [
      "Est-ce que le jeu fonctionne vraiment ?",
      "Comment puis-je être sûr que ça marche ?",
      "Quel est le prix du jeu ?",
      "Je veux l'acheter mais j'hésite"
    ]
  });
}