// src/app/api/payments/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { PaymentProvider } from '@/types/payment';
import { paymentGateway } from '@/lib/services/payment-gateway';

interface PaymentRequestBody {
  paymentMethod: string;
  amount: number;
  currency: string;
  orderId: number;
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
    city: string;
  };
  metadata?: Record<string, any>;
}

function getPaymentProvider(method: string): PaymentProvider {
  switch (method.toLowerCase()) {
    case 'wave':
    case 'wave_money':
      return 'WAVE';
    case 'orange':
    case 'orange_money':
      return 'ORANGE_MONEY';
    case 'card':
    case 'stripe':
      return 'STRIPE';
    case 'cash':
    case 'cod':
      return 'CASH';
    default:
      throw new Error(`Méthode de paiement non supportée: ${method}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequestBody;
    const { paymentMethod, amount, currency, orderId, customerInfo, metadata } = body;

    // Vérification de la commande
    let order;
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError && orderError.code !== 'PGRST116') {  // PGRST116 = not found
      console.error('Order query error:', orderError);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche de la commande' },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      // Créer une nouvelle commande si elle n'existe pas
      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert([{
          id: orderId,
          status: 'PENDING',
          total_amount: amount,
          customer_name: customerInfo.name,
          phone: customerInfo.phone,
          city: customerInfo.city,
          email: customerInfo.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            paymentMethod,
            currency,
            ...metadata
          }
        }])
        .select()
        .single();

      if (createError) {
        console.error('Order creation error:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la commande' },
          { status: 500 }
        );
      }

      order = newOrder;
    } else {
      order = existingOrder;
    }

    if (order.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cette commande a déjà été payée' },
        { status: 400 }
      );
    }

    // Configuration des données de paiement
    const paymentConfig = {
      provider: getPaymentProvider(paymentMethod),
      amount,
      currency,
      orderId,
      customerInfo: {
        ...customerInfo,
        phone: customerInfo.phone.replace(/\s/g, ''),
        country: 'SN',
        locale: 'fr-FR'
      },
      successRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/chat`,
      errorRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/chat`,
      callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${paymentMethod.toLowerCase()}`,
      merchantReference: `order_${orderId}_${Date.now()}`,
      metadata: {
        orderId: orderId.toString(),
        ...metadata,
        initiatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    };

    const result = await paymentGateway.initiatePayment(paymentConfig);

    if (!result.success) {
      console.error('Payment initiation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'initiation du paiement' },
        { status: 400 }
      );
    }

    // Mise à jour du statut de la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'PAYMENT_PENDING',
        updated_at: new Date().toISOString(),
        metadata: {
          ...order.metadata,
          paymentProvider: paymentConfig.provider,
          paymentInitiated: new Date().toISOString()
        }
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue lors du traitement de la requête'
      },
      { status: 500 }
    );
  }
}