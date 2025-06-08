// app/api/orders/confirm-cash-payment/route.ts - NOUVELLE API POUR PAIEMENT LIVRAISON
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ConfirmCashPaymentRequest {
  orderId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmCashPaymentRequest = await request.json();
    console.log('🛵 Confirming cash payment:', body);

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande manquant' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ VÉRIFIER QUE LA COMMANDE EXISTE ET EST EN ATTENTE
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('❌ Order not found:', fetchError);
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (order.payment_method !== 'CASH') {
      return NextResponse.json(
        { error: 'Cette commande n\'est pas configurée pour le paiement à la livraison' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ CONFIRMER LA COMMANDE POUR PAIEMENT À LA LIVRAISON
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'pending', // Restera pending jusqu'à livraison
        updated_at: new Date().toISOString(),
        metadata: {
          ...order.metadata,
          cashPaymentConfirmed: true,
          confirmedAt: new Date().toISOString()
        }
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la confirmation de la commande' },
        { status: 500, headers: corsHeaders }
      );
    }

    // ✅ AJOUTER UN HISTORIQUE DE STATUT
    try {
      await supabase
        .from('delivery_status_history')
        .insert({
          order_id: orderId,
          status: 'confirmed',
          notes: 'Commande confirmée - Paiement à la livraison',
          created_at: new Date().toISOString()
        });
    } catch (historyError) {
      console.warn('⚠️ Could not add status history (non-blocking):', historyError);
    }

    console.log('✅ Cash payment confirmed for order:', orderId);

    return NextResponse.json(
      {
        success: true,
        orderId: orderId,
        status: 'confirmed',
        message: 'Commande confirmée pour paiement à la livraison'
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Error confirming cash payment:', error);

    return NextResponse.json(
      { 
        error: 'Erreur lors de la confirmation du paiement à la livraison',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}