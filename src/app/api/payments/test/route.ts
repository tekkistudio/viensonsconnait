// src/app/api/payments/test/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    console.log('Starting webhook test...');

    // Création du payload de test
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

    // Génération de la signature
    const signature = crypto
      .createHmac('sha256', process.env.BICTORYS_WEBHOOK_SECRET || '')
      .update(JSON.stringify(testPayload))
      .digest('hex');

    console.log('Generated signature:', signature);
    console.log('Test payload:', testPayload);

    // Envoi de la requête webhook
    const webhookUrl = new URL('/api/webhook/bictorys', process.env.NEXT_PUBLIC_APP_URL).toString();
    console.log('Webhook URL:', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': signature
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('Webhook response:', responseText);

    if (!response.ok) {
      throw new Error(`Webhook test failed (${response.status}): ${responseText}`);
    }

    return NextResponse.json({
      success: true,
      message: "Test webhook sent successfully",
      data: {
        payload: testPayload,
        response: responseText
      }
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}