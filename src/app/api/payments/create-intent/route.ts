// src/app/api/payments/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { PAYMENT_CONFIG } from '@/lib/config/payment.config';

const stripe = new Stripe(PAYMENT_CONFIG.stripe.secretKey!, {
  apiVersion: PAYMENT_CONFIG.stripe.apiVersion
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, orderId, customerInfo } = body;

    // Vérifier la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    if (order.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cette commande a déjà été payée' },
        { status: 400 }
      );
    }

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId.toString(),
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerCity: customerInfo.city
      }
    });

    // Mettre à jour la commande
    await supabase
      .from('orders')
      .update({
        status: 'PAYMENT_PENDING',
        payment_method: 'STRIPE',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      success: true
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'intention de paiement' },
      { status: 500 }
    );
  }
}