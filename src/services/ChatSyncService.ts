// services/ChatSyncService.ts
import { supabase } from '@/lib/supabase';
import type { 
  OrderData,
  OrderStatus,
  OrderMetadata,
  ChatMessage,
  PaymentMessage
} from '@/features/product/types/chat';

export class ChatSyncService {
  // Synchronise une nouvelle commande du chat vers la base de données
  static async syncOrder(orderData: OrderData): Promise<{ id: string; status: OrderStatus }> {
    try {
      const metadata: OrderMetadata = {
        source: 'chatbot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        conversationHistory: orderData.conversationHistory || [], // Ajout d'une valeur par défaut
        buyingIntentScore: 0,
        currency: 'XOF',
        country: 'SN',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      };
  
      const totalAmount = orderData.totalAmount || 
        orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          product_id: orderData.items[0]?.productId,
          customer_name: `${orderData.firstName} ${orderData.lastName}`,
          first_name: orderData.firstName,
          last_name: orderData.lastName,
          city: orderData.city,
          address: orderData.address,
          phone: orderData.phone,
          payment_method: orderData.paymentMethod,
          order_details: orderData.orderDetails,
          total_amount: totalAmount,
          delivery_cost: orderData.deliveryCost || 
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

  // Vérifie la disponibilité du produit
  static async checkProductAvailability(productId: string, quantity: number = 1): Promise<{
    available: boolean;
    currentStock: number;
  }> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_quantity, status')
        .eq('id', productId)
        .single();

      if (error) throw error;

      return {
        available: 
          product.status === 'active' && 
          (product.stock_quantity || 0) >= quantity,
        currentStock: product.stock_quantity || 0
      };

    } catch (error) {
      console.error('Error checking product availability:', error);
      throw new Error('Failed to check product availability');
    }
  }

  // Met à jour le statut de paiement
  static async updatePaymentStatus(
    orderId: string,
    paymentMessage: PaymentMessage
  ) {
    try {
      const status = this.mapPaymentStatus(paymentMessage.paymentData?.status);

      // Mise à jour de la commande
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status,
          metadata: {
            paymentStatus: paymentMessage.paymentData?.status,
            paymentProvider: paymentMessage.paymentData?.provider,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Enregistrement de la transaction
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

  // Méthode pour récupérer l'historique des commandes d'un client
  static async getCustomerOrders(phone: string) {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          payment_transactions (
            id,
            provider,
            status,
            transaction_id,
            amount,
            currency,
            metadata
          )
        `)
        .eq('phone', phone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return orders;

    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw new Error('Failed to fetch customer orders');
    }
  }

  // Méthode pour synchroniser le stock après une commande
  static async updateProductStock(orderId: string) {
    try {
      // Récupérer la commande avec les items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const items = order.metadata?.items || [];
      
      // Mettre à jour le stock pour chaque produit
      for (const item of items) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();

        if (productError) throw productError;

        const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (updateError) throw updateError;
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating product stock:', error);
      throw new Error('Failed to update product stock');
    }
  }

  // Méthode privée pour mapper les statuts de paiement aux statuts de commande
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