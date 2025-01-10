// src/app/api/test/webhook/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    console.log('Starting webhook test...');

    // 1. Préparer le payload de test
    const testPayload = {
      id: crypto.randomUUID(),
      merchantId: "d2d2053b-638d-4133-957e-3caf63e6b79c",
      type: "payment",
      amount: 14000,
      currency: "XOF",
      paymentReference: `test_${Date.now()}`,
      status: "succeeded",
      customerObject: {
        name: "Test User",
        phone: "221776794638",
        email: "test@example.com",
        city: "Dakar"
      },
      pspName: "orange_money",
      paymentMeans: "+221 *** ** 09",
      timestamp: new Date().toISOString()
    };

    // 2. Générer la signature
    const signature = crypto
      .createHmac('sha256', process.env.BICTORYS_WEBHOOK_SECRET || '')
      .update(JSON.stringify(testPayload))
      .digest('hex');

    console.log('Test data prepared:', {
      payload: testPayload,
      signature: signature.substring(0, 10) + '...'
    });

    // 3. Envoyer au webhook
    const response = await fetch(
      new URL('/api/webhook/bictorys', process.env.NEXT_PUBLIC_APP_URL).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': signature
        },
        body: JSON.stringify(testPayload)
      }
    );

    // 4. Retourner le résultat
    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}