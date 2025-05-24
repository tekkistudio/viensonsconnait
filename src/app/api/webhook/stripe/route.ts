// src/app/api/webhook/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/lib/services/notification.service';
import { pusherServer } from '@/lib/pusher';
import { PAYMENT_CONFIG } from '@/lib/config/payment.config';

const stripe = new Stripe(PAYMENT_CONFIG.stripe.secretKey!, {
  apiVersion: PAYMENT_CONFIG.stripe.apiVersion
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        PAYMENT_CONFIG.stripe.webhookSecret!
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Mettre à jour la transaction
        const { data: transaction, error: transactionError } = await supabase
          .from('payment_transactions')
          .update({
            status: 'COMPLETED',
            metadata: {
              stripePaymentId: session.payment_intent,
              paymentStatus: 'completed',
              updatedAt: new Date().toISOString(),
              mode: PAYMENT_CONFIG.mode
            }
          })
          .eq('reference', session.id)
          .select('*, orders(*)')
          .single();

        if (transactionError) throw transactionError;

        // Mettre à jour la commande
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'PAID',
            payment_method: 'STRIPE',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.order_id);

        if (orderError) throw orderError;

        // Notification Pusher
        await pusherServer.trigger(
          `order_${transaction.order_id}`,
          'payment_status',
          {
            status: 'success',
            orderId: transaction.order_id,
            amount: session.amount_total ? session.amount_total / 100 : null,
            transactionId: session.id
          }
        );

        // Notification email
        const customerEmail = session.customer_details?.email;
        if (transaction && customerEmail) {
          await notificationService.sendNotification({
            type: 'PAYMENT_RECEIVED',
            orderId: transaction.order_id,
            recipientEmail: customerEmail
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from('payment_transactions')
          .update({
            status: 'FAILED',
            metadata: {
              stripePaymentId: paymentIntent.id,
              error: paymentIntent.last_payment_error?.message,
              updatedAt: new Date().toISOString(),
              mode: PAYMENT_CONFIG.mode
            }
          })
          .eq('reference', paymentIntent.id);
        
        if (paymentIntent.metadata?.orderId) {
          await pusherServer.trigger(
            `order_${paymentIntent.metadata.orderId}`,
            'payment_status',
            {
              status: 'failed',
              orderId: paymentIntent.metadata.orderId,
              error: paymentIntent.last_payment_error?.message
            }
          );
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase
          .from('payment_transactions')
          .update({
            status: 'EXPIRED',
            metadata: {
              updatedAt: new Date().toISOString(),
              mode: PAYMENT_CONFIG.mode
            }
          })
          .eq('reference', session.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}