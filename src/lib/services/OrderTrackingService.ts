// src/lib/services/OrderTrackingService.ts - NOUVEAU SERVICE SUIVI COMMANDE
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep } from '@/types/chat';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  total_amount: number;
  customer_name: string;
  address: string;
  city: string;
  phone: string;
  order_details: any;
  tracking_number?: string;
  delivery_company?: string;
}

interface TrackingResponse {
  found: boolean;
  order?: OrderStatus;
  message: string;
  statusHistory?: Array<{
    status: string;
    date: string;
    description: string;
  }>;
}

export class OrderTrackingService {
  private static instance: OrderTrackingService;

  private constructor() {}

  public static getInstance(): OrderTrackingService {
    if (!this.instance) {
      this.instance = new OrderTrackingService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE: Récupérer le statut de commande
  async getOrderStatus(sessionId: string): Promise<TrackingResponse> {
    try {
      console.log('🔍 Tracking order for session:', sessionId);

      // Récupérer la commande depuis la base de données
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !order) {
        console.log('❌ No order found for session:', sessionId);
        return {
          found: false,
          message: 'Aucune commande trouvée pour cette session.'
        };
      }

      console.log('✅ Order found:', order.id, 'Status:', order.status);

      // Récupérer l'historique des statuts si disponible
      const statusHistory = await this.getStatusHistory(order.id);

      return {
        found: true,
        order: order as OrderStatus,
        message: 'Commande trouvée avec succès',
        statusHistory
      };

    } catch (error) {
      console.error('❌ Error tracking order:', error);
      return {
        found: false,
        message: 'Erreur lors de la récupération du statut de commande.'
      };
    }
  }

  // ✅ RÉCUPÉRER L'HISTORIQUE DES STATUTS
  private async getStatusHistory(orderId: string): Promise<Array<{
    status: string;
    date: string;
    description: string;
  }>> {
    try {
      const { data: history, error } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error || !history) {
        return [];
      }

      return history.map(entry => ({
        status: entry.status,
        date: entry.created_at,
        description: entry.notes || this.getStatusDescription(entry.status)
      }));

    } catch (error) {
      console.error('❌ Error fetching status history:', error);
      return [];
    }
  }

  // ✅ DESCRIPTIONS DES STATUTS
  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      'pending': 'Commande reçue et en attente de traitement',
      'confirmed': 'Commande confirmée et validée',
      'processing': 'Commande en cours de préparation',
      'shipped': 'Commande expédiée et en transit',
      'delivered': 'Commande livrée avec succès',
      'cancelled': 'Commande annulée'
    };

    return descriptions[status] || 'Statut mis à jour';
  }

  // ✅ CRÉER UN MESSAGE DE CHAT AVEC LE STATUT
  async createTrackingMessage(sessionId: string): Promise<ChatMessage> {
    const trackingResponse = await this.getOrderStatus(sessionId);

    if (!trackingResponse.found) {
      return {
        type: 'assistant',
        content: `🔍 **Suivi de commande**

${trackingResponse.message}

📞 **Pour toute question :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

Comment puis-je vous aider autrement ?`,
        choices: [
          '📞 Contacter le support',
          '🛍️ Passer une nouvelle commande',
          '🏠 Page d\'accueil'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'customer_support' as ConversationStep,
          externalUrl: {
            type: 'whatsapp',
            url: 'https://wa.me/221781362728',
            description: 'Contacter le support'
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    const order = trackingResponse.order!;
    const statusInfo = this.getDetailedStatusInfo(order.status);
    const paymentStatusText = this.getPaymentStatusText(order.payment_status);

    // Décoder les détails de la commande
    let orderItems: any[] = [];
    try {
      if (order.order_details) {
        orderItems = typeof order.order_details === 'string' ? 
          JSON.parse(order.order_details) : 
          order.order_details;
      }
    } catch (error) {
      console.error('Error parsing order details:', error);
    }

    const itemsText = orderItems.length > 0 ? 
      orderItems.map((item: any) => `${item.name || 'Produit'} x${item.quantity || 1}`).join(', ') : 
      'Information non disponible';

    let content = `🔍 **Suivi de votre commande #${order.id}**

${statusInfo.emoji} **Statut : ${statusInfo.title}**
${statusInfo.description}

📋 **Détails :**
• Passée le : ${new Date(order.created_at).toLocaleDateString('fr-FR')}
• Articles : ${itemsText}
• Total : ${order.total_amount?.toLocaleString() || 'N/A'} FCFA
• ${paymentStatusText}

📍 **Livraison :**
${order.address}, ${order.city}`;

    // Ajouter le numéro de suivi si disponible
    if (order.tracking_number) {
      content += `\n🚚 **Suivi : ${order.tracking_number}**`;
    }

    // Ajouter l'historique si disponible
    if (trackingResponse.statusHistory && trackingResponse.statusHistory.length > 0) {
      content += '\n\n📅 **Historique :**\n';
      trackingResponse.statusHistory.slice(-3).forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString('fr-FR');
        content += `• ${date} : ${entry.description}\n`;
      });
    }

    content += '\n📞 **Questions ? Contactez-nous :**\nWhatsApp : +221 78 136 27 28';

    // Choix selon le statut
    let choices: string[] = [];
    if (order.status === 'pending' || order.status === 'confirmed') {
      choices = [
        '📞 WhatsApp (+221 78 136 27 28)',
        '🏠 Changer d\'adresse',
        '❌ Annuler la commande'
      ];
    } else if (order.status === 'shipped') {
      choices = [
        '📞 WhatsApp (+221 78 136 27 28)',
        '📦 Détails de livraison',
        '🔄 Actualiser le statut'
      ];
    } else if (order.status === 'delivered') {
      choices = [
        '⭐ Laisser un avis',
        '🛍️ Commander autre chose',
        '📞 Support client'
      ];
    } else {
      choices = [
        '📞 WhatsApp (+221 78 136 27 28)',
        '🛍️ Commander autre chose',
        '📧 Envoyer par email'
      ];
    }

    return {
      type: 'assistant',
      content,
      choices,
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'order_details_shown' as ConversationStep,
        orderId: order.id,
        orderStatus: order.status,
        externalUrl: {
          type: 'whatsapp',
          url: 'https://wa.me/221781362728',
          description: 'Contacter pour suivi'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ INFORMATIONS DÉTAILLÉES DU STATUT
  private getDetailedStatusInfo(status: string): {
    emoji: string;
    title: string;
    description: string;
  } {
    const statusMap = {
      'pending': {
        emoji: '⏳',
        title: 'En attente',
        description: 'Votre commande est en cours de traitement'
      },
      'confirmed': {
        emoji: '✅',
        title: 'Confirmée',
        description: 'Commande confirmée, préparation en cours'
      },
      'processing': {
        emoji: '📦',
        title: 'En préparation',
        description: 'Votre commande est en cours de préparation'
      },
      'shipped': {
        emoji: '🚚',
        title: 'Expédiée',
        description: 'Votre commande est en route vers vous'
      },
      'delivered': {
        emoji: '🎉',
        title: 'Livrée',
        description: 'Commande livrée avec succès'
      },
      'cancelled': {
        emoji: '❌',
        title: 'Annulée',
        description: 'Commande annulée'
      }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap['pending'];
  }

  // ✅ TEXTE DU STATUT DE PAIEMENT
  private getPaymentStatusText(paymentStatus: string): string {
    const statusMap = {
      'completed': '✅ Paiement confirmé',
      'pending': '⏳ En attente de paiement',
      'failed': '❌ Échec du paiement',
      'refunded': '🔄 Remboursé'
    };

    return statusMap[paymentStatus as keyof typeof statusMap] || '❓ Statut de paiement inconnu';
  }

  // ✅ METTRE À JOUR LE STATUT D'UNE COMMANDE
  async updateOrderStatus(
    orderId: string, 
    newStatus: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      // Mettre à jour le statut de la commande
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('❌ Error updating order status:', orderError);
        return false;
      }

      // Ajouter à l'historique
      const { error: historyError } = await supabase
        .from('delivery_status_history')
        .insert({
          order_id: orderId,
          status: newStatus,
          notes: notes || this.getStatusDescription(newStatus),
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('❌ Error adding to status history:', historyError);
        // Ne pas faire échouer la mise à jour pour ça
      }

      console.log('✅ Order status updated successfully:', orderId, newStatus);
      return true;

    } catch (error) {
      console.error('❌ Error in updateOrderStatus:', error);
      return false;
    }
  }

  // ✅ RECHERCHER UNE COMMANDE PAR NUMÉRO DE TÉLÉPHONE
  async findOrdersByPhone(phone: string): Promise<OrderStatus[]> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error finding orders by phone:', error);
        return [];
      }

      return orders || [];

    } catch (error) {
      console.error('❌ Error in findOrdersByPhone:', error);
      return [];
    }
  }
}