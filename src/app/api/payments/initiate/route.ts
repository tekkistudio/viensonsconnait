// src/app/api/payments/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentGateway } from '@/lib/services/payment-gateway';
import { supabase } from '@/lib/supabase';

// Types pour la requête et la réponse
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequestBody;
    const { paymentMethod, amount, currency, orderId, customerInfo } = body;

    // Vérifier que la commande existe et n'est pas déjà payée
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

    // Déterminer le provider de paiement
    const provider = paymentMethod === 'mobile_money' ? 'WAVE' : 'STRIPE';

    // Initialiser le paiement
    const paymentResult = await paymentGateway.initiatePayment({
      amount,
      currency,
      provider,
      customerInfo,
      orderId,
      metadata: {
        paymentMethod,
        initiatedFrom: 'web'
      }
    });

    if (!paymentResult.success) {
      // Gestion plus détaillée de l'erreur
      const errorMessage = typeof paymentResult.error === 'string' 
        ? paymentResult.error 
        : 'Erreur lors de l\'initiation du paiement';
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // Mettre à jour le statut de la commande
    await supabase
      .from('orders')
      .update({
        status: 'PAYMENT_PENDING',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    return NextResponse.json(paymentResult);
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      },
      { status: 500 }
    );
  }
}