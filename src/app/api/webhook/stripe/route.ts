// src/app/api/webhook/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/lib/services/notification.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any
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
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Gérer les différents types d'événements Stripe
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
              updatedAt: new Date().toISOString()
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
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.order_id);

        if (orderError) throw orderError;

        // S'assurer que nous avons l'email avant d'envoyer la notification
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

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Mettre à jour la transaction comme expirée
        await supabase
          .from('payment_transactions')
          .update({
            status: 'EXPIRED',
            metadata: {
              updatedAt: new Date().toISOString()
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