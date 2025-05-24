// src/services/ChatSyncService.ts
import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage,
  PaymentMessage,
  ConversationStep
} from '@/types/chat';

import type {
  OrderData,
  OrderStatus,
  ExtendedOrderMetadata,
  PaymentProvider,
  PaymentStatus
} from '@/types/order';

export class ChatSyncService {
  // Synchronise une nouvelle commande du chat vers la base de données
  static async syncOrder(orderData: OrderData): Promise<{ id: string; status: OrderStatus }> {
    try {
      const metadata: ExtendedOrderMetadata = {
        source: 'chatbot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        conversationHistory: orderData.metadata?.conversationHistory || [],
        buyingIntentScore: orderData.metadata?.buyingIntentScore || 0,
        currency: 'XOF',
        country: 'SN',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        storeId: orderData.metadata?.storeId || '',
        productId: orderData.items[0]?.productId || '',
        conversationId: orderData.session_id,
        customerInfo: {
          firstName: orderData.first_name,
          lastName: orderData.last_name,
          fullName: `${orderData.first_name} ${orderData.last_name}`,
          phone: orderData.phone
        },
        shippingInfo: {
          city: orderData.city,
          address: orderData.address,
          deliveryCost: orderData.delivery_cost
        }
      };
  
      const totalAmount = orderData.total_amount || 
        orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          session_id: orderData.session_id,
          product_id: orderData.items[0]?.productId,
          first_name: orderData.first_name,
          last_name: orderData.last_name,
          city: orderData.city,
          address: orderData.address,
          phone: orderData.phone,
          payment_method: orderData.payment_method,
          order_details: orderData.order_details,
          total_amount: totalAmount,
          delivery_cost: orderData.delivery_cost || 
            (orderData.city.toLowerCase() === 'dakar' ? 0 : 3000),
          status: 'pending' as OrderStatus,
          metadata
        })
        .select()
        .single();
  
      if (error) throw error;
      return order;
  
    } catch (error) {
      console.error('Error syncing order:', error);
      throw new Error('Failed to sync order');
    }
  }

  // [Other methods remain the same...]

  // Met à jour le statut de paiement avec des types corrects
  static async updatePaymentStatus(
    orderId: string,
    paymentMessage: PaymentMessage
  ) {
    try {
      const status = this.mapPaymentStatus(paymentMessage.paymentData?.status);

      const metadata: Partial<ExtendedOrderMetadata> = {
        updatedAt: new Date().toISOString(),
        paymentStatus: paymentMessage.paymentData?.status as PaymentStatus,
        paymentProvider: paymentMessage.paymentData?.provider as PaymentProvider,
      };

      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status,
          metadata: metadata
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      if (paymentMessage.paymentData) {
        const { error: transactionError } = await supabase
          .from('payment_transactions')
          .insert({
            order_id: orderId,
            provider: paymentMessage.paymentData.provider,
            amount: paymentMessage.paymentData.amount,
            currency: paymentMessage.paymentData.currency,
            status: paymentMessage.paymentData.status,
            metadata: {
              source: 'chatbot',
              timestamp: new Date().toISOString()
            }
          });

        if (transactionError) throw transactionError;
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  private static mapPaymentStatus(paymentStatus?: string): OrderStatus {
    switch (paymentStatus) {
      case 'completed':
        return 'paid';
      case 'failed':
        return 'cancelled';
      case 'processing':
        return 'processing';
      default:
        return 'pending';
    }
  }
}