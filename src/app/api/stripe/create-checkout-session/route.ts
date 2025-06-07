// src/app/api/stripe/create-checkout-session/route.ts - VERSION CORRIGÉE
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { convertCFAToEUR, debugConversion } from '@/lib/utils/currency';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, // ✅ Montant en FCFA
      currency = 'eur', 
      orderId, 
      customerName,
      successUrl,
      cancelUrl 
    } = body;

    console.log('🏦 Stripe session creation request:', { 
      originalAmount: amount, 
      currency, 
      orderId 
    });

    // ✅ CORRECTION PRINCIPALE: Conversion FCFA → EUR
    let finalAmount: number;
    
    if (currency === 'eur') {
      // Si le montant arrive en FCFA, on le convertit
      if (amount > 1000) { // Probablement en FCFA
        finalAmount = convertCFAToEUR(amount);
        console.log(`💱 Converting ${amount} FCFA to ${finalAmount/100}€ (${finalAmount} centimes)`);
        
        // ✅ DEBUG pour vérifier la conversion
        debugConversion(amount);
      } else {
        // Le montant est déjà en centimes d'EUR
        finalAmount = amount;
      }
    } else {
      finalAmount = amount;
    }

    // Validation du montant minimum Stripe (50 centimes)
    if (finalAmount < 50) {
      return NextResponse.json(
        { error: 'Le montant minimum pour Stripe est de 0,50€' },
        { status: 400 }
      );
    }

    // ✅ Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'VIENS ON S\'CONNAÎT - Jeu de cartes relationnel',
              description: `Commande #${orderId}`,
              images: ['https://your-domain.com/images/product-image.jpg'], // ✅ Ajouter image produit
            },
            unit_amount: finalAmount, // ✅ Montant en centimes d'EUR
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/cancel?order_id=${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        customerName: customerName || 'Client',
        source: 'chatbot',
        originalAmountFCFA: amount.toString()
      },
      customer_email: undefined, // Permettre à l'utilisateur de saisir son email
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['SN', 'CI', 'FR', 'BE', 'CH', 'CA'], // ✅ Pays supportés
      },
      payment_intent_data: {
        description: `Commande VIENS ON S'CONNAÎT #${orderId}`,
        metadata: {
          orderId: orderId.toString(),
          source: 'chatbot'
        }
      }
    });

    console.log('✅ Stripe session created successfully:', {
      sessionId: session.id,
      url: session.url,
      amountInCentimes: finalAmount,
      amountInEur: finalAmount / 100
    });

    return NextResponse.json({
      id: session.id,
      url: session.url,
      amount: finalAmount,
      currency: 'eur'
    });

  } catch (error) {
    console.error('❌ Stripe session creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la session de paiement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ✅ GESTION des autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
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