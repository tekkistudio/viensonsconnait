// src/app/api/payments/validate-wave/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { transactionId, orderId, amount } = await request.json();

    console.log('🌊 [WAVE VALIDATION] Validating transaction:', {
      transactionId,
      orderId,
      amount
    });

    // ✅ VALIDATION des paramètres
    if (!transactionId || !orderId) {
      return NextResponse.json(
        { error: 'Transaction ID et Order ID requis' },
        { status: 400 }
      );
    }

    // ✅ VÉRIFIER que la commande existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    // ✅ VÉRIFIER que le montant correspond
    if (amount && Math.abs(order.total_amount - amount) > 1) {
      console.error('❌ Amount mismatch:', { expected: order.total_amount, received: amount });
      return NextResponse.json(
        { error: 'Montant incorrect' },
        { status: 400 }
      );
    }

    // ✅ ENREGISTRER la transaction
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        id: transactionId,
        order_id: orderId,
        provider: 'WAVE',
        amount: amount || order.total_amount,
        currency: 'XOF',
        status: 'COMPLETED',
        reference: transactionId,
        metadata: {
          validatedAt: new Date().toISOString(),
          validationMethod: 'manual_input'
        }
      });

    if (transactionError) {
      console.error('❌ Transaction save error:', transactionError);
      // Continuer même si l'enregistrement échoue
    }

    // ✅ METTRE À JOUR la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'completed',
        payment_reference: transactionId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Order update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande' },
        { status: 500 }
      );
    }

    console.log('✅ [WAVE VALIDATION] Payment validated successfully');

    return NextResponse.json({
      success: true,
      message: 'Paiement Wave validé avec succès',
      orderId: orderId,
      transactionId: transactionId,
      status: 'confirmed'
    });

  } catch (error) {
    console.error('❌ [WAVE VALIDATION] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la validation du paiement Wave',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}