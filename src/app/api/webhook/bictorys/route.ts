// src/app/api/webhook/bictorys/route.ts
import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';

export async function POST(req: Request) {
  try {
    // 1. Lire le body
    const bodyText = await req.text();
    console.log('Received webhook body:', bodyText);

    // 2. Parser en JSON
    const payload = JSON.parse(bodyText);
    console.log('Parsed payload:', payload);

    // 3. Obtenir la signature
    const signature = req.headers.get('X-Secret-Key');
    console.log('Received signature:', signature);

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // 4. Traiter le webhook
    const result = await paymentService.handleWebhook(payload, signature);

    // 5. Répondre
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}