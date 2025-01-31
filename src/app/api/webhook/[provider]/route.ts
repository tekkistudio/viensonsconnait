// src/app/api/webhooks/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { bictorysService } from '@/lib/services/bictorys.service';
import { notificationService } from '@/lib/services/notification.service';
import { pusherServer } from '@/lib/pusher';

const STRIPE_API_VERSION = '2024-12-18.acacia' as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION
});

interface WebhookHandlerContext {
  orderId: number; // Changé de string à number
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending';
  paymentMethod: string;
  transactionId: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

async function updateOrderStatus(context: WebhookHandlerContext) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      status: context.status === 'succeeded' ? 'PAID' : context.status.toUpperCase(),
      updated_at: new Date().toISOString(),
      payment_method: context.paymentMethod,
      metadata: {
        ...context.metadata,
        lastPaymentAttempt: new Date().toISOString()
      }
    })
    .eq('id', context.orderId)
    .select()
    .single();

  if (orderError) throw orderError;
  return order;
}

async function updateTransactionStatus(context: WebhookHandlerContext) {
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .update({
      status: context.status.toUpperCase(),
      metadata: {
        paymentMethod: context.paymentMethod,
        transactionId: context.transactionId,
        lastUpdate: new Date().toISOString(),
        ...context.metadata
      }
    })
    .eq('order_id', context.orderId);

  if (transactionError) throw transactionError;
}

async function notifyClient(context: WebhookHandlerContext) {
    // Notify via Pusher
    await pusherServer.trigger(`order_${context.orderId}`, 'payment_status', {
      status: context.status,
      amount: context.amount,
      currency: context.currency,
      transactionId: context.transactionId
    });
  
    // Add system message to chat
    await supabase.from('chat_messages').insert([{
      order_id: context.orderId,
      type: 'SYSTEM',
      content: context.status === 'succeeded'
        ? `✅ Paiement de ${context.amount} ${context.currency} reçu avec succès.`
        : `❌ Échec du paiement de ${context.amount} ${context.currency}.`,
      metadata: {
        paymentStatus: context.status,
        paymentMethod: context.paymentMethod,
        transactionId: context.transactionId
      }
    }]);
  
    // Send email notification if payment succeeded
    if (context.status === 'succeeded' && context.customerEmail) {
      await notificationService.sendNotification({
        type: 'PAYMENT_RECEIVED',
        orderId: context.orderId.toString(), // Converti en string pour le service de notification
        recipientEmail: context.customerEmail
      });
    }
  }

async function handleStripeWebhook(req: NextRequest, signature: string) {
  const body = await req.text();
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  const session = event.data.object as Stripe.Checkout.Session;
  const customerEmail = session.customer_details?.email || undefined;
  
  const context: WebhookHandlerContext = {
    orderId: parseInt(session.metadata?.orderId || '0', 10), // Conversion en number
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || 'XOF').toUpperCase(),
    status: session.payment_status === 'paid' ? 'succeeded' : 'failed',
    paymentMethod: 'STRIPE',
    transactionId: (session.payment_intent as string) || session.id,
    ...(customerEmail && { customerEmail }),
    metadata: {
      sessionId: session.id,
      customerId: session.customer
    }
  };

  await updateOrderStatus(context);
  await updateTransactionStatus(context);
  await notifyClient(context);

  return { received: true };
}

async function handleBictorysWebhook(req: NextRequest, signature: string) {
  const payload = await req.json();
  const result = await bictorysService.handleWebhook(payload, signature);

  if (!result.success) {
    throw new Error('Invalid Bictorys webhook signature');
  }

  const context: WebhookHandlerContext = {
    orderId: typeof result.transaction.order_id === 'string' 
      ? parseInt(result.transaction.order_id, 10) 
      : result.transaction.order_id,  // Conversion en number si nécessaire
    amount: payload.amount,
    currency: payload.currency,
    status: payload.status,
    paymentMethod: payload.paymentMeans,
    transactionId: payload.id,
    metadata: {
      provider: 'BICTORYS',
      reference: payload.merchantReference
    }
  };

  await updateOrderStatus(context);
  await updateTransactionStatus(context);
  await notifyClient(context);

  return { received: true };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    switch (params.provider) {
      case 'stripe':
        const stripeSignature = req.headers.get('stripe-signature')!;
        return NextResponse.json(await handleStripeWebhook(req, stripeSignature));

      case 'bictorys':
        const bictorysSignature = req.headers.get('X-Signature') || req.headers.get('X-Secret-Key')!;
        return NextResponse.json(await handleBictorysWebhook(req, bictorysSignature));

      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Webhook error (${params.provider}):`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook handler failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}