// app/api/payments/validate-wave/route.ts - NOUVELLE API POUR VALIDATION WAVE
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface WaveValidationRequest {
  transactionId: string;
  orderId: string;
  amount: number;
}

export async function POST(req: Request) {
  try {
    const { transactionId, orderId, amount }: WaveValidationRequest = await req.json();
    
    console.log('🌊 [WAVE API] Validation request:', { transactionId, orderId, amount });

    // ✅ VALIDATION DES DONNÉES
    if (!transactionId || !orderId || !amount) {
      return NextResponse.json(
        { error: 'Données manquantes pour la validation' },
        { status: 400 }
      );
    }

    // ✅ VALIDATION FORMAT ID TRANSACTION WAVE
    const waveIdPattern = /^T[A-Z0-9]{12,16}$/i;
    if (!waveIdPattern.test(transactionId)) {
      return NextResponse.json(
        { error: 'Format d\'ID de transaction Wave invalide' },
        { status: 400 }
      );
    }

    // ✅ VÉRIFIER QUE LA COMMANDE EXISTE
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ [WAVE API] Order not found:', orderError);
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // ✅ VÉRIFIER QUE LE MONTANT CORRESPOND
    if (Math.abs(order.total_amount - amount) > 1) { // Tolérance de 1 FCFA
      console.error('❌ [WAVE API] Amount mismatch:', { 
        orderAmount: order.total_amount, 
        providedAmount: amount 
      });
      return NextResponse.json(
        { error: 'Montant de la transaction incorrect' },
        { status: 400 }
      );
    }

    // ✅ VÉRIFIER QUE LE PAIEMENT N'EST PAS DÉJÀ VALIDÉ
    if (order.payment_status === 'completed' || order.payment_status === 'success') {
      console.log('⚠️ [WAVE API] Payment already completed');
      return NextResponse.json(
        { message: 'Paiement déjà validé', alreadyCompleted: true },
        { status: 200 }
      );
    }

    // ✅ VÉRIFIER SI CET ID DE TRANSACTION N'A PAS DÉJÀ ÉTÉ UTILISÉ
    const { data: existingPayment } = await supabase
      .from('orders')
      .select('id')
      .eq('wave_transaction_id', transactionId)
      .neq('id', orderId)
      .single();

    if (existingPayment) {
      console.error('❌ [WAVE API] Transaction ID already used');
      return NextResponse.json(
        { error: 'Cet ID de transaction a déjà été utilisé' },
        { status: 409 }
      );
    }

    // ✅ METTRE À JOUR LA COMMANDE AVEC LA VALIDATION
    const updateData = {
      payment_status: 'completed',
      status: 'confirmed',
      wave_transaction_id: transactionId,
      payment_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ [WAVE API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande' },
        { status: 500 }
      );
    }

    // ✅ ENREGISTRER LA VALIDATION DANS L'HISTORIQUE
    try {
      await supabase
        .from('delivery_status_history')
        .insert({
          order_id: orderId,
          status: 'confirmed',
          notes: `Paiement Wave validé - Transaction: ${transactionId}`,
          created_at: new Date().toISOString()
        });
    } catch (historyError) {
      console.warn('⚠️ [WAVE API] History insert failed (non-blocking):', historyError);
    }

    // ✅ NOTIFIER LE CLIENT (optionnel - pour notifications futures)
    // TODO: Ajouter notification email/SMS si configuré

    console.log('✅ [WAVE API] Payment validated successfully:', { orderId, transactionId });

    return NextResponse.json({
      success: true,
      message: 'Paiement Wave validé avec succès',
      orderId,
      transactionId,
      amount,
      paymentMethod: 'Wave',
      validatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [WAVE API] Critical error:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ✅ MÉTHODE OPTIONS POUR CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}