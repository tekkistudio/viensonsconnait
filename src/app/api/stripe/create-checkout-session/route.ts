// ===================================================================
// src/app/api/stripe/create-checkout-session/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(request: NextRequest) {
  try {
    const { 
      amount, 
      currency, 
      orderId, 
      customerEmail, 
      customerName,
      successUrl,
      cancelUrl,
      metadata 
    } = await request.json();

    if (!amount || !currency || !orderId) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    console.log('🛒 Creating Stripe Checkout Session:', {
      amount,
      currency,
      orderId
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Commande #${orderId}`,
              description: 'VIENS ON S\'CONNAÎT - Jeu de cartes relationnel',
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId,
        ...metadata
      },
      ...(customerEmail && {
        customer_email: customerEmail
      }),
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    console.log('✅ Checkout Session created:', session.id);

    // Sauvegarder la session
    try {
      await supabase.from('payment_transactions').insert({
        id: session.id,
        order_id: orderId,
        provider: 'STRIPE',
        amount: amount / 100,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        reference: session.id,
        metadata: {
          sessionId: session.id,
          sessionUrl: session.url,
          customerEmail,
          customerName,
          ...metadata
        }
      });
    } catch (dbError) {
      console.error('⚠️ Database save error:', dbError);
    }

    return NextResponse.json({
      id: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Checkout Session creation error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

