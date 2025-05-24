// src/app/api/webhook/stripe/success/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { pusherServer } from '@/lib/pusher';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      console.error('Session ID missing');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/chat?payment=error&reason=missing_session`
      );
    }

    // Vérifier le statut de la session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      const orderId = session.metadata?.orderId;
      const transactionId = session.metadata?.transactionId;
      
      if (orderId) {
        try {
          // Mettre à jour le statut de la commande
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              status: 'PAID',
              updated_at: new Date().toISOString(),
              metadata: {
                stripeSession: session.id,
                paymentIntent: session.payment_intent,
                paymentStatus: session.payment_status,
                updatedAt: new Date().toISOString()
              }
            })
            .eq('id', orderId);

          if (orderError) {
            console.error('Order update error:', orderError);
          }

          // Mettre à jour la transaction
          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .update({
              status: 'COMPLETED',
              metadata: {
                stripeSession: session.id,
                paymentIntent: session.payment_intent,
                paymentStatus: session.payment_status,
                updatedAt: new Date().toISOString()
              }
            })
            .eq('id', transactionId);

          if (transactionError) {
            console.error('Transaction update error:', transactionError);
          }

          // Envoyer une notification via Pusher
          await pusherServer.trigger(
            `order_${orderId}`,
            'payment_status',
            {
              status: 'success',
              orderId,
              sessionId,
              paymentIntent: session.payment_intent,
              amount: session.amount_total,
              currency: session.currency
            }
          );

        } catch (error) {
          console.error('Database or Pusher error:', error);
        }
      }
    }

    // Rediriger vers le chat avec le statut approprié
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/chat?payment=${
        session.payment_status === 'paid' ? 'success' : 'pending'
      }`
    );

  } catch (error) {
    console.error('Payment success webhook error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/chat?payment=error&reason=webhook_error`
    );
  }
}