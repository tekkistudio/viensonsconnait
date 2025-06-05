// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, orderId, customerInfo, metadata } = await request.json();

    // Validation des données
    if (!amount || !currency || !orderId) {
      return NextResponse.json(
        { error: 'Données manquantes: amount, currency, orderId requis' },
        { status: 400 }
      );
    }

    if (amount < 50) { // Minimum Stripe (0.50 EUR)
      return NextResponse.json(
        { error: 'Montant minimum non atteint (0.50 EUR)' },
        { status: 400 }
      );
    }

    console.log('💳 Creating Stripe Payment Intent:', {
      amount,
      currency,
      orderId
    });

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Commande #${orderId} - VIENS ON S'CONNAÎT`,
      ...(customerInfo?.email && {
        receipt_email: customerInfo.email
      })
    });

    console.log('✅ Payment Intent created:', paymentIntent.id);

    // Sauvegarder dans la base de données
    try {
      await supabase.from('payment_transactions').insert({
        id: paymentIntent.id,
        order_id: orderId,
        provider: 'STRIPE',
        amount: amount / 100, // Reconvertir en unités principales
        currency: currency.toUpperCase(),
        status: 'PENDING',
        reference: paymentIntent.id,
        metadata: {
          clientSecret: paymentIntent.client_secret,
          customerInfo,
          ...metadata
        }
      });

      console.log('✅ Transaction saved to database');
    } catch (dbError) {
      console.error('⚠️ Database save error:', dbError);
      // Ne pas faire échouer le paiement pour autant
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('❌ Payment Intent creation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

