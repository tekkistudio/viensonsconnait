// src/app/api/stripe/create-checkout-session/route.ts - VERSION CORRIGÉE ET SIMPLIFIÉE
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ✅ Initialiser Stripe avec version API stable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, // Montant en FCFA
      currency = 'eur', 
      orderId, 
      customerName,
      successUrl,
      cancelUrl 
    } = body;

    console.log('🏦 Creating Stripe session:', { 
      originalAmount: amount, 
      currency, 
      orderId 
    });

    // ✅ VALIDATION des paramètres obligatoires
    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Paramètres manquants: amount et orderId requis' },
        { status: 400 }
      );
    }

    // ✅ CONVERSION FCFA → EUR (1 EUR ≈ 655 FCFA)
    let finalAmountInCentimes: number;
    
    if (amount > 1000) {
      // Le montant est probablement en FCFA, on le convertit
      const FCFA_TO_EUR_RATE = 0.00153; // 1 FCFA = 0.00153 EUR
      const eurAmount = amount * FCFA_TO_EUR_RATE;
      finalAmountInCentimes = Math.round(eurAmount * 100); // Convertir en centimes
      
      console.log(`💱 Conversion: ${amount} FCFA → ${eurAmount.toFixed(2)} EUR (${finalAmountInCentimes} centimes)`);
    } else {
      // Le montant est déjà en centimes d'EUR
      finalAmountInCentimes = amount;
    }

    // ✅ VALIDATION du montant minimum Stripe (50 centimes = 0,50€)
    if (finalAmountInCentimes < 50) {
      return NextResponse.json(
        { 
          error: 'Montant trop faible',
          details: `Minimum requis: 0,50€. Montant reçu: ${finalAmountInCentimes/100}€`
        },
        { status: 400 }
      );
    }

    // ✅ CRÉER la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'VIENS ON S\'CONNAÎT - Jeu de cartes',
              description: `Commande #${orderId} - Jeu pour renforcer les relations`,
            },
            unit_amount: finalAmountInCentimes,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/payment-cancel?order_id=${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        customerName: customerName || 'Client',
        source: 'chatbot_viens_on_s_connait',
        originalAmountFCFA: amount.toString()
      },
      billing_address_collection: 'auto',
      payment_intent_data: {
        description: `VIENS ON S'CONNAÎT - Commande #${orderId}`,
        metadata: {
          orderId: orderId.toString(),
          source: 'chatbot'
        }
      }
    });

    console.log('✅ Stripe session created:', {
      sessionId: session.id,
      url: session.url,
      amountCentimes: finalAmountInCentimes,
      amountEUR: finalAmountInCentimes / 100
    });

    return NextResponse.json({
      id: session.id,
      url: session.url,
      amount: finalAmountInCentimes,
      currency: 'eur',
      success: true
    });

  } catch (error) {
    console.error('❌ Stripe session creation error:', error);
    
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : error instanceof Error 
        ? error.message 
        : 'Erreur inconnue';
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du paiement Stripe',
        details: errorMessage,
        success: false
      },
      { status: 500 }
    );
  }
}

// ✅ Gestion des autres méthodes HTTP
export async function GET() {
  return NextResponse.json(
    { error: 'Méthode non autorisée. Utilisez POST.' }, 
    { status: 405 }
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}