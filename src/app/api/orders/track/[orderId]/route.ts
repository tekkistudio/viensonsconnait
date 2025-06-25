// src/app/api/orders/track/[orderId]/route.ts
// API pour suivre une commande

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;

    console.log('📦 [ORDER TRACKING] Tracking order:', orderId);

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID requis' },
        { status: 400 }
      );
    }

    // ✅ RÉCUPÉRER la commande avec les détails
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        products:product_id (
          name,
          images
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    // ✅ RÉCUPÉRER les transactions de paiement
    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    // ✅ CALCULER le statut d'avancement
    const getOrderProgress = (status: string, paymentStatus: string) => {
      const steps = [
        { key: 'created', label: 'Commande créée', completed: true },
        { key: 'confirmed', label: 'Commande confirmée', completed: ['confirmed', 'shipped', 'delivered'].includes(status) },
        { key: 'paid', label: 'Paiement reçu', completed: ['completed', 'pending_delivery'].includes(paymentStatus) },
        { key: 'shipped', label: 'Expédiée', completed: ['shipped', 'delivered'].includes(status) },
        { key: 'delivered', label: 'Livrée', completed: status === 'delivered' }
      ];
      
      return steps;
    };

    const progress = getOrderProgress(order.status, order.payment_status);

    console.log('✅ [ORDER TRACKING] Order found:', order.id);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        totalAmount: order.total_amount,
        quantity: order.quantity,
        productName: order.products?.name || 'Produit',
        productImage: order.products?.images?.[0],
        customerName: `${order.first_name} ${order.last_name}`,
        address: `${order.address}, ${order.city}`,
        phone: order.phone,
        createdAt: order.created_at,
        confirmedAt: order.confirmed_at
      },
      progress: progress,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('❌ [ORDER TRACKING] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du suivi de commande',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}