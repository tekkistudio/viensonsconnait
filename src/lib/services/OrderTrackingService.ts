// src/lib/services/OrderTrackingService.ts - VERSION COMPLÈTE CORRIGÉE
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep } from '@/types/chat';

// ✅ CORRECTION 1: Types alignés avec ChatOrderData
type OrderStatusType = 'pending' | 'confirmed' | 'cancelled';
type PaymentStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'success';

interface OrderStatus {
  id: string;
  session_id?: string;
  status: OrderStatusType;
  payment_status: PaymentStatusType;
  created_at: string;
  updated_at: string;
  total_amount: number;
  customer_name: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  phone: string;
  order_details: any;
  tracking_number?: string;
  delivery_company?: string;
  payment_method?: string;
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

// ✅ CORRECTION 2: Fonction de validation du statut
function validateOrderStatus(status: any): OrderStatusType {
  const validStatuses: OrderStatusType[] = ['pending', 'confirmed', 'cancelled'];
  
  if (typeof status === 'string' && validStatuses.includes(status as OrderStatusType)) {
    return status as OrderStatusType;
  }
  
  // Mapping pour les statuts étendus vers les statuts de base
  const statusMapping: Record<string, OrderStatusType> = {
    'processing': 'confirmed',
    'shipped': 'confirmed', 
    'delivered': 'confirmed',
    'paid': 'confirmed',
    'failed': 'cancelled'
  };
  
  if (typeof status === 'string' && statusMapping[status]) {
    return statusMapping[status];
  }
  
  return 'pending'; // Valeur par défaut
}

// ✅ CORRECTION 3: Fonction de validation ConversationStep
function validateConversationStep(step: any): ConversationStep {
  const validSteps: ConversationStep[] = [
    'initial', 'initial_engagement', 'mode_selection', 'generic_response',
    'error_recovery', 'fallback_response', 'whatsapp_redirect',
    'customer_support', 'order_details_shown', 
    'post_purchase_options', 'order_complete',
    // ✅ CORRECTION: Utiliser des steps valides au lieu des steps manquants
    'customer_service',  // Au lieu de 'order_not_found'
    'error_recovery'     // Au lieu de 'tracking_error'
  ];

  if (typeof step === 'string' && validSteps.includes(step as ConversationStep)) {
    return step as ConversationStep;
  }
  
  return 'generic_response';
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

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE: Récupérer le statut de commande
  async getOrderStatus(sessionId: string): Promise<TrackingResponse> {
    try {
      console.log('🔍 [TRACKING] Searching order for session:', sessionId);

      let order: any = null;
      let error: any = null;

      // Essayer d'abord par session_id
      const { data: orderBySession, error: sessionError } = await supabase
        .from('orders')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!sessionError && orderBySession) {
        order = orderBySession;
        console.log('✅ [TRACKING] Order found by session_id:', order.id);
      } else {
        console.log('⚠️ [TRACKING] No order found by session_id, trying by ID...');
        
        // Essayer par ID si le sessionId ressemble à un ID de commande
        if (sessionId.length < 20 && /^\d+$/.test(sessionId)) {
          const { data: orderById, error: idError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', parseInt(sessionId))
            .single();

          if (!idError && orderById) {
            order = orderById;
            console.log('✅ [TRACKING] Order found by ID:', order.id);
          } else {
            error = idError;
          }
        } else {
          error = sessionError;
        }
      }

      if (error || !order) {
        console.log('❌ [TRACKING] No order found for session:', sessionId, error);
        return {
          found: false,
          message: 'Aucune commande trouvée pour cette session.'
        };
      }

      console.log('✅ [TRACKING] Order found:', order.id, 'Status:', order.status);

      // Récupérer l'historique des statuts si disponible
      const statusHistory = await this.getStatusHistory(order.id);

      return {
        found: true,
        order: order as OrderStatus,
        message: 'Commande trouvée avec succès',
        statusHistory
      };

    } catch (error) {
      console.error('❌ [TRACKING] Error tracking order:', error);
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
        console.log('⚠️ [TRACKING] No status history found for order:', orderId);
        return [];
      }

      console.log('✅ [TRACKING] Status history found:', history.length, 'entries');

      return history.map(entry => ({
        status: entry.status,
        date: entry.created_at,
        description: entry.notes || this.getStatusDescription(validateOrderStatus(entry.status))
      }));

    } catch (error) {
      console.error('❌ [TRACKING] Error fetching status history:', error);
      return [];
    }
  }

  // ✅ DESCRIPTIONS DES STATUTS CORRIGÉES
  private getStatusDescription(status: OrderStatusType): string {
    const descriptions: Record<OrderStatusType, string> = {
      'pending': 'Commande reçue et en attente de traitement',
      'confirmed': 'Commande confirmée et validée',
      'cancelled': 'Commande annulée'
    };

    return descriptions[status] || 'Statut mis à jour';
  }

  // ✅ CRÉER UN MESSAGE DE CHAT AVEC LE STATUT DÉTAILLÉ
  async createTrackingMessage(sessionId: string): Promise<ChatMessage> {
    console.log('🔍 [TRACKING] Creating tracking message for session:', sessionId);
    
    const trackingResponse = await this.getOrderStatus(sessionId);

    if (!trackingResponse.found) {
      console.log('❌ [TRACKING] No order found, returning generic message');
      
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
          nextStep: validateConversationStep('customer_support'),
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

    console.log('✅ [TRACKING] Order details:', {
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total_amount
    });

    // Décoder les détails de la commande de manière robuste
    let orderItems: any[] = [];
    try {
      if (order.order_details) {
        if (typeof order.order_details === 'string') {
          orderItems = JSON.parse(order.order_details);
        } else if (Array.isArray(order.order_details)) {
          orderItems = order.order_details;
        } else if (typeof order.order_details === 'object') {
          orderItems = order.order_details.items || [order.order_details];
        }
      }
    } catch (parseError) {
      console.error('❌ [TRACKING] Error parsing order details:', parseError);
      orderItems = [];
    }

    const itemsText = orderItems.length > 0 ? 
      orderItems.map((item: any) => {
        const name = item.name || item.productName || 'Produit';
        const quantity = item.quantity || 1;
        return `${name} x${quantity}`;
      }).join(', ') : 
      'Information non disponible';

    // Construire le nom complet du client
    let customerName = 'Client';
    if (order.first_name && order.last_name) {
      customerName = `${order.first_name} ${order.last_name}`;
    } else if (order.customer_name) {
      customerName = order.customer_name;
    } else if (order.first_name) {
      customerName = order.first_name;
    }

    let content = `🔍 **Suivi de votre commande #${order.id}**

${statusInfo.emoji} **Statut : ${statusInfo.title}**
${statusInfo.description}

📋 **Détails :**
• Passée le : ${new Date(order.created_at).toLocaleDateString('fr-FR')}
• Client : ${customerName}
• Articles : ${itemsText}
• Total : ${order.total_amount?.toLocaleString() || 'N/A'} FCFA
• ${paymentStatusText}`;

    // Ajouter l'adresse de livraison si disponible
    if (order.address && order.city) {
      content += `\n\n📍 **Livraison :**\n${order.address}, ${order.city}`;
    }

    // Ajouter le numéro de suivi si disponible
    if (order.tracking_number) {
      content += `\n🚚 **Suivi : ${order.tracking_number}**`;
      if (order.delivery_company) {
        content += ` (${order.delivery_company})`;
      }
    }

    // Ajouter l'historique si disponible
    if (trackingResponse.statusHistory && trackingResponse.statusHistory.length > 0) {
      content += '\n\n📅 **Historique :**';
      // Afficher les 3 derniers événements
      trackingResponse.statusHistory.slice(-3).forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString('fr-FR');
        const time = new Date(entry.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        content += `\n• ${date} ${time} : ${entry.description}`;
      });
    }

    content += '\n\n📞 **Questions ? Contactez-nous :**\nWhatsApp : +221 78 136 27 28';

    // Choix selon le statut de la commande
    let choices: string[] = [];
    
    if (order.status === 'pending') {
      choices = [
        '📞 WhatsApp (+221 78 136 27 28)',
        '🏠 Changer d\'adresse',
        '🔄 Actualiser le statut'
      ];
    } else if (order.status === 'confirmed') {
      choices = [
        '📞 WhatsApp (+221 78 136 27 28)',
        '🔄 Actualiser le statut',
        '📦 Détails de livraison'
      ];
    } else if (order.status === 'cancelled') {
      choices = [
        '❓ Pourquoi annulée ?',
        '🛍️ Passer une nouvelle commande',
        '📞 Contacter le support'
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
        nextStep: validateConversationStep('order_details_shown'),
        orderId: order.id.toString(),
        orderStatus: order.status,
        orderData: {
            id: order.id,
            session_id: order.session_id || sessionId,
            status: validateOrderStatus(order.status), 
            payment_status: order.payment_status,
            total_amount: order.total_amount,
            first_name: order.first_name,        
            last_name: order.last_name,         
            name: customerName,                
            phone: order.phone,                 
            address: order.address,
            city: order.city,
            items: orderItems
            },
        externalUrl: {
          type: 'whatsapp',
          url: 'https://wa.me/221781362728',
          description: 'Contacter pour suivi'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ INFORMATIONS DÉTAILLÉES DU STATUT CORRIGÉES
  private getDetailedStatusInfo(status: OrderStatusType): {
    emoji: string;
    title: string;
    description: string;
  } {
    const statusMap: Record<OrderStatusType, { emoji: string; title: string; description: string }> = {
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
      'cancelled': {
        emoji: '❌',
        title: 'Annulée',
        description: 'Commande annulée'
      }
    };

    return statusMap[status] || statusMap['pending'];
  }

  // ✅ TEXTE DU STATUT DE PAIEMENT CORRIGÉ
  private getPaymentStatusText(paymentStatus: PaymentStatusType): string {
    const statusMap: Record<PaymentStatusType, string> = {
      'completed': '✅ Paiement confirmé',
      'success': '✅ Paiement confirmé',
      'pending': '⏳ En attente de paiement',
      'processing': '🔄 Paiement en cours',
      'failed': '❌ Échec du paiement',
      'cancelled': '🔄 Paiement annulé'
    };

    return statusMap[paymentStatus] || '❓ Statut de paiement inconnu';
  }

  // ✅ METTRE À JOUR LE STATUT D'UNE COMMANDE AVEC VALIDATION
  async updateOrderStatus(
    orderId: string, 
    newStatus: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 [TRACKING] Updating order status:', { orderId, newStatus, notes });

      // Validation du statut
      const validatedStatus = validateOrderStatus(newStatus);

      // Mettre à jour le statut de la commande
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: validatedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('❌ [TRACKING] Error updating order status:', orderError);
        return false;
      }

      // Ajouter à l'historique
      const { error: historyError } = await supabase
        .from('delivery_status_history')
        .insert({
          order_id: orderId,
          status: validatedStatus,
          notes: notes || this.getStatusDescription(validatedStatus),
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('❌ [TRACKING] Error adding to status history:', historyError);
        // Ne pas faire échouer la mise à jour pour ça
      }

      console.log('✅ [TRACKING] Order status updated successfully:', orderId, validatedStatus);
      return true;

    } catch (error) {
      console.error('❌ [TRACKING] Error in updateOrderStatus:', error);
      return false;
    }
  }

  // ✅ RECHERCHER UNE COMMANDE PAR NUMÉRO DE TÉLÉPHONE
  async findOrdersByPhone(phone: string): Promise<OrderStatus[]> {
    try {
      console.log('📞 [TRACKING] Finding orders by phone:', phone);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ [TRACKING] Error finding orders by phone:', error);
        return [];
      }

      console.log('✅ [TRACKING] Found orders by phone:', orders?.length || 0);
      return (orders || []) as OrderStatus[];

    } catch (error) {
      console.error('❌ [TRACKING] Error in findOrdersByPhone:', error);
      return [];
    }
  }

  // ✅ RECHERCHER UNE COMMANDE PAR EMAIL
  async findOrdersByEmail(email: string): Promise<OrderStatus[]> {
    try {
      console.log('📧 [TRACKING] Finding orders by email:', email);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ [TRACKING] Error finding orders by email:', error);
        return [];
      }

      console.log('✅ [TRACKING] Found orders by email:', orders?.length || 0);
      return (orders || []) as OrderStatus[];

    } catch (error) {
      console.error('❌ [TRACKING] Error in findOrdersByEmail:', error);
      return [];
    }
  }

  // ✅ STATISTIQUES DE COMMANDES
  async getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  }> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status');

      if (error || !orders) {
        return {
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0
        };
      }

      return {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        completedOrders: orders.filter(o => o.status === 'confirmed').length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length
      };

    } catch (error) {
      console.error('❌ [TRACKING] Error getting order stats:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0
      };
    }
  }

  // ✅ CRÉER UN MESSAGE DE TRACKING POUR UN ID SPÉCIFIQUE
  async createTrackingMessageForOrderId(orderId: string): Promise<ChatMessage> {
    console.log('🔍 [TRACKING] Creating tracking message for order ID:', orderId);
    
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', parseInt(orderId))
        .single();

      if (error || !order) {
        return {
          type: 'assistant',
          content: `❌ **Commande non trouvée**

Aucune commande trouvée avec l'ID : **${orderId}**

📞 **Contactez-nous si vous pensez qu'il y a une erreur :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com`,
          choices: [
            '📞 Contacter le support',
            '🔍 Chercher avec un autre ID',
            '🏠 Page d\'accueil'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: validateConversationStep('order_not_found')
          },
          timestamp: new Date().toISOString()
        };
      }

      // Utiliser la méthode existante avec une session factice
      const fakeSessionId = `order_${orderId}_tracking`;
      return await this.createTrackingMessage(fakeSessionId);

    } catch (error) {
      console.error('❌ [TRACKING] Error creating tracking message for order ID:', error);
      return {
        type: 'assistant',
        content: `❌ **Erreur technique**

Une erreur est survenue lors de la recherche de votre commande.

📞 **Contactez notre support :**
• WhatsApp : +221 78 136 27 28`,
        choices: ['📞 Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: validateConversationStep('tracking_error')
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}