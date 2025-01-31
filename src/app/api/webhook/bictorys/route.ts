// src/app/api/webhook/bictorys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { pusherServer } from '@/lib/pusher';
import { promises as fs } from 'fs';
import path from 'path';
import { notificationService } from '@/lib/services/notification.service';

// Fonction pour écrire les logs dans un fichier
async function logToFile(message: string, data?: any) {
  const logMessage = `${new Date().toISOString()} - ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
  const logPath = path.join(process.cwd(), 'webhook-logs.txt');
  await fs.appendFile(logPath, logMessage);
}

interface WebhookContext {
  orderId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending';
  paymentMethod: string;
  transactionId: string;
  merchantReference: string;
  metadata?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Logging initial
    await logToFile('🎯 Webhook Bictorys reçu');
    
    // 2. Vérification de la signature
    const secretKey = req.headers.get('X-Secret-Key');
    if (!secretKey || secretKey !== process.env.BICTORYS_WEBHOOK_SECRET) {
      await logToFile('❌ Signature invalide');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 3. Récupération et validation du payload
    const payload = await req.json();
    await logToFile('📦 Payload webhook reçu:', payload);

    if (!payload.merchantReference || !payload.status) {
      await logToFile('❌ Payload invalide');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // 4. Récupération de la transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*, orders(*)')
      .eq('reference', payload.merchantReference)
      .single();

    if (transactionError || !transaction) {
      await logToFile('❌ Transaction non trouvée:', payload.merchantReference);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 5. Mise à jour du statut
    const status = payload.status === 'succeeded' ? 'COMPLETED' 
                 : payload.status === 'failed' ? 'FAILED' 
                 : payload.status.toUpperCase();

    await logToFile('🔄 Mise à jour statut:', { status });

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status,
        metadata: {
          ...transaction.metadata,
          webhookPayload: payload,
          updatedAt: new Date().toISOString()
        }
      })
      .eq('reference', payload.merchantReference);

    if (updateError) {
      await logToFile('❌ Erreur mise à jour transaction:', updateError);
      throw updateError;
    }

    // 6. Si paiement réussi, mettre à jour la commande
    if (status === 'COMPLETED') {
      await supabase
        .from('orders')
        .update({
          status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      // Notification Pusher
      await pusherServer.trigger(
        `order_${transaction.order_id}`,
        'payment_status',
        {
          status: 'success',
          orderId: transaction.order_id,
          amount: payload.amount,
          transactionId: payload.id
        }
      );

      // Notification email si email disponible
      if (transaction.orders?.customer_email) {
        await notificationService.sendNotification({
          type: 'PAYMENT_RECEIVED',
          orderId: transaction.order_id,
          recipientEmail: transaction.orders.customer_email
        });
      }
    }

    await logToFile('✅ Webhook traité avec succès');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    await logToFile('❌ Erreur webhook:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Webhook processing failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}