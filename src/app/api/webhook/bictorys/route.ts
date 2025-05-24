// src/app/api/webhooks/bictorys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { pusherServer } from '@/lib/pusher';
import { PAYMENT_CONFIG } from '@/lib/config/payment.config';

export async function POST(request: NextRequest) {
  try {
    // Vérification du secret key dans les headers
    const secretKey = request.headers.get('X-Secret-Key');
    if (!secretKey || secretKey !== PAYMENT_CONFIG.bictorys.webhookSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    
    // Validation du payload
    if (!payload.merchantReference || !payload.status) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const orderId = payload.merchantReference;

    // Mise à jour de la transaction
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: payload.status.toUpperCase(),
        metadata: {
          webhookPayload: payload,
          updatedAt: new Date().toISOString()
        }
      })
      .eq('order_id', orderId);

    if (updateError) throw updateError;

    // Si le paiement est réussi
    if (payload.status === 'succeeded') {
      // Mise à jour du statut de la commande
      await supabase
        .from('orders')
        .update({
          status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      // Notification via Pusher
      await pusherServer.trigger(
        `order_${orderId}`,
        'payment_status',
        {
          status: 'success',
          transactionId: payload.id
        }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
