// src/app/api/stripe/create-payment-intent/route.ts - NOUVEAU ENDPOINT
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // ✅ Version mise à jour
  typescript: true,
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'eur', orderId, automatic_payment_methods } = body;

    // Validation des paramètres
    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande requis' },
        { status: 400 }
      );
    }

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Montant en centimes
      currency: currency,
      metadata: {
        orderId: String(orderId),
        source: 'viens_on_s_connait_chat',
        created_at: new Date().toISOString()
      },
      automatic_payment_methods: automatic_payment_methods || {
        enabled: true,
      },
    });

    console.log('✅ PaymentIntent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('❌ Error creating PaymentIntent:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stripe PaymentIntent API',
    status: 'healthy',
    methods: ['POST']
  });
}