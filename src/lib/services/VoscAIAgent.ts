// src/lib/services/VoscAIAgent.ts

import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ProductData, 
  CustomerData,
  OrderData,
  ConversationStep
} from '@/types/chat';

interface AIContext {
  productId?: string;
  sessionId: string;
  conversationHistory: ChatMessage[];
  customerData?: Partial<CustomerData>;
  currentStep?: ConversationStep;
  metadata?: Record<string, any>;
}

interface AIResponse {
  message: string;
  choices: string[];
  nextStep?: ConversationStep;
  actions?: string[];
  metadata?: Record<string, any>;
}

export class VoscAIAgent {
  private static instance: VoscAIAgent;
  private botInfo = {
  name: 'Rose', 
  title: 'Votre Assistante d\'achat',
  avatar: '/path/to/avatar.jpg' // Ajoutez une photo
};

  private constructor() {}

  public static getInstance(): VoscAIAgent {
    if (!this.instance) {
      this.instance = new VoscAIAgent();
    }
    return this.instance;
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE: Traiter toute interaction avec l'agent IA
   */
  async processUserMessage(
    userMessage: string,
    context: AIContext
  ): Promise<ChatMessage> {
    try {
      console.log('🤖 Agent IA - Traitement du message:', userMessage);
      console.log('📋 Contexte:', context);

      // 1. Analyser l'intention de l'utilisateur
      const intent = await this.analyzeUserIntent(userMessage, context);
      console.log('🎯 Intention détectée:', intent);

      // 2. Récupérer les données contextuelles nécessaires
      const aiData = await this.gatherContextualData(context, intent);

      // 3. Générer la réponse appropriée selon l'intention
      let response: AIResponse;

      switch (intent.type) {
        case 'purchase_intent':
          response = await this.handlePurchaseIntent(userMessage, context, aiData, intent);
          break;
        
        case 'product_inquiry':
          response = await this.handleProductInquiry(userMessage, context, aiData, intent);
          break;
        
        case 'order_status':
          response = await this.handleOrderStatus(userMessage, context, aiData, intent);
          break;
        
        case 'general_question':
          response = await this.handleGeneralQuestion(userMessage, context, aiData, intent);
          break;
        
        case 'support_request':
          response = await this.handleSupportRequest(userMessage, context, aiData, intent);
          break;
        
        default:
          response = await this.handleUnknownIntent(userMessage, context, aiData);
      }

      // 4. Formatter la réponse finale
      return this.formatChatMessage(response, context);

    } catch (error) {
      console.error('❌ Erreur Agent IA:', error);
      return this.createErrorResponse(context);
    }
  }

  /**
   * 🧠 ANALYSE DE L'INTENTION DE L'UTILISATEUR
   */
  private async analyzeUserIntent(
    message: string, 
    context: AIContext
  ): Promise<{
    type: string;
    confidence: number;
    entities: Record<string, any>;
    subIntent?: string;
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Mots-clés pour identifier les intentions
    const intentKeywords = {
      purchase_intent: [
        'acheter', 'commander', 'commande', 'achète', 'veux', 'prendre',
        'réserver', 'livre', 'livraison', 'payer', 'paiement', 'prix'
      ],
      product_inquiry: [
        'comment', 'règles', 'jouer', 'fonctionne', 'explique', 'description',
        'détails', 'plus d\'info', 'c\'est quoi', 'bénéfices', 'avantages'
      ],
      order_status: [
        'commande', 'statut', 'où', 'livré', 'reçu', 'suivi', 'tracking',
        'délai', 'quand', 'combien de temps'
      ],
      support_request: [
        'problème', 'aide', 'support', 'contact', 'whatsapp', 'téléphone',
        'email', 'réclamation', 'retour', 'remboursement'
      ]
    };

    // Détection basique de l'intention
    let detectedIntent = 'general_question';
    let confidence = 0.6;
    let entities: Record<string, any> = {};

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
      if (matches.length > 0) {
        detectedIntent = intent;
        confidence = Math.min(0.9, 0.6 + (matches.length * 0.1));
        entities.matchedKeywords = matches;
        break;
      }
    }

    // Extraction d'entités spécifiques
    if (detectedIntent === 'order_status') {
      // Recherche de numéro de commande
      const orderMatch = message.match(/(?:commande|order|#)\s*(\w+)/i);
      if (orderMatch) {
        entities.orderId = orderMatch[1];
      }
    }

    return {
      type: detectedIntent,
      confidence,
      entities,
      subIntent: this.detectSubIntent(detectedIntent, message)
    };
  }

  /**
   * 📊 RÉCUPÉRATION DES DONNÉES CONTEXTUELLES
   */
  private async gatherContextualData(
    context: AIContext, 
    intent: any
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    try {
      // 1. Données du produit actuel
      if (context.productId) {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', context.productId)
          .single();
        
        if (product) {
          data.currentProduct = product;
        }
      }

      // 2. Liste de tous les produits actifs
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      data.allProducts = allProducts || [];

      // 3. Données client si disponibles
      if (context.customerData?.phone) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', context.customerData.phone)
          .single();
        
        data.customerProfile = customer;

        // Historique des commandes du client
        if (customer) {
          const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          data.customerOrders = orders || [];
        }
      }

      // 4. Zones de livraison
      const { data: deliveryZones } = await supabase
        .from('delivery_zones')
        .select('*');
      
      data.deliveryZones = deliveryZones || [];

      // 5. Statistiques de vente pour la preuve sociale
      const { data: salesStats } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .eq('status', 'confirmed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      data.recentSalesCount = salesStats?.length || 0;
      data.totalRevenue = salesStats?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // 6. Base de connaissances pour les réponses
      const { data: knowledge } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('priority', { ascending: true });
      
      data.knowledgeBase = knowledge || [];

      return data;

    } catch (error) {
      console.error('❌ Erreur récupération données:', error);
      return data;
    }
  }

  /**
   * 🛒 GESTION DE L'INTENTION D'ACHAT
   */
  private async handlePurchaseIntent(
    message: string,
    context: AIContext,
    data: Record<string, any>,
    intent: any
  ): Promise<AIResponse> {
    
    const product = data.currentProduct;
    
    if (!product) {
      return {
        message: `🤗 Bonjour ! Je suis Rose, votre conseillère VIENS ON S'CONNAÎT.

Je vois que vous êtes prêt(e) à passer commande ! Quel jeu vous intéresse le plus ?`,
        choices: data.allProducts.slice(0, 3).map((p: any) => p.name),
        nextStep: 'product_selection' as ConversationStep,
        actions: ['show_products']
      };
    }

    // Analyser le niveau d'urgence de l'achat
    const urgencyKeywords = ['maintenant', 'rapidement', 'vite', 'aujourd\'hui', 'direct'];
    const isUrgent = urgencyKeywords.some(keyword => message.toLowerCase().includes(keyword));

    const recentSales = data.recentSalesCount || 0;
    const socialProof = recentSales > 0 ? `✨ ${recentSales} personnes ont déjà commandé ce mois-ci !` : '';

    if (isUrgent) {
      return {
        message: `🚀 **Parfait ! Commande express pour ${product.name}**

${socialProof}

💰 **Prix:** ${product.price.toLocaleString()} FCFA
📦 **Livraison:** Disponible dans 12 pays africains

Je peux traiter votre commande en moins d'1 minute ! Quelle quantité souhaitez-vous ?`,
        choices: ['1 jeu', '2 jeux', '3 jeux ou plus'],
        nextStep: 'express_quantity' as ConversationStep,
        actions: ['start_express_order'],
        metadata: { 
          flow: 'express',
          productId: product.id,
          showSocialProof: true
        }
      };
    }

    return {
      message: `🎯 **Excellent choix ! ${product.name}**

${socialProof}

${product.description || 'Un jeu qui transforme vos relations en créant des conversations authentiques et profondes.'}

💰 **Prix:** ${product.price.toLocaleString()} FCFA
🚚 **Livraison gratuite** dès 15 000 FCFA

Comment préférez-vous procéder ?`,
      choices: [
        '⚡ Commande express (< 1 min)',
        '🤔 J\'ai quelques questions',
        '📱 Voir l\'app mobile'
      ],
      nextStep: 'purchase_flow_choice' as ConversationStep,
      actions: ['prepare_order_options']
    };
  }

  /**
   * ❓ GESTION DES QUESTIONS SUR LE PRODUIT
   */
  private async handleProductInquiry(
    message: string,
    context: AIContext,
    data: Record<string, any>,
    intent: any
  ): Promise<AIResponse> {
    
    const product = data.currentProduct;
    const lowerMessage = message.toLowerCase();

    // Identifier le type de question
    if (lowerMessage.includes('comment') && (lowerMessage.includes('jouer') || lowerMessage.includes('fonctionne'))) {
      // Question sur les règles du jeu
      const rules = product?.game_rules || 'Les règles détaillées sont fournies avec le jeu et dans notre application mobile.';
      
      return {
        message: `🎮 **Comment jouer à ${product?.name || 'nos jeux'} :**

${rules}

🕒 **Durée:** Flexible (15 min à 2h selon vos envies)
👥 **Joueurs:** À partir de 2 personnes
🎯 **Objectif:** Créer des conversations authentiques et renforcer vos liens

Cela répond à votre question ?`,
        choices: [
          '✅ Parfait, je veux l\'acheter',
          '❓ J\'ai d\'autres questions',
          '👥 C\'est pour qui exactement ?'
        ],
        nextStep: 'post_inquiry' as ConversationStep
      };
    }

    if (lowerMessage.includes('bénéfice') || lowerMessage.includes('avantage') || lowerMessage.includes('pourquoi')) {
      // Question sur les bénéfices
      return {
        message: `💝 **Voici ce que ${product?.name || 'nos jeux'} vous apportent :**

🤝 **Relations plus fortes** - Conversations authentiques qui rapprochent
💬 **Communication améliorée** - Apprendre à vraiment s'écouter
❤️ **Moments de qualité** - Temps précieux sans distraction
🌟 **Souvenirs durables** - Histoires à partager pour la vie

✨ **Bonus:** Plus de 1 000 familles africaines ont déjà transformé leurs relations !

Lequel de ces bénéfices vous attire le plus ?`,
        choices: [
          '🤝 Des relations plus fortes',
          '💬 Mieux communiquer',
          '✅ Je veux l\'essayer !'
        ],
        nextStep: 'benefit_discussion' as ConversationStep
      };
    }

    // Question générale sur le produit
    return {
      message: `📋 **À propos de ${product?.name || 'ce jeu'} :**

${product?.description || 'Un jeu de cartes relationnel conçu pour améliorer vos relations.'}

🎯 **Ce qui rend ce jeu unique :**
• Développé par des psychologues au Sénégal
• Testé par plus de 1 000 familles africaines
• Adapté à nos valeurs et notre culture
• Questions pensées pour notre contexte

Qu'aimeriez-vous savoir de plus ?`,
      choices: [
        '🎮 Comment y jouer ?',
        '💝 Quels bénéfices ?',
        '🛒 Je veux l\'acheter'
      ],
      nextStep: 'detailed_inquiry' as ConversationStep
    };
  }

  /**
   * 📦 GESTION DU STATUT DE COMMANDE
   */
  private async handleOrderStatus(
    message: string,
    context: AIContext,
    data: Record<string, any>,
    intent: any
  ): Promise<AIResponse> {
    
    const orderId = intent.entities?.orderId;
    const customerOrders = data.customerOrders || [];

    if (orderId) {
      // Recherche spécifique d'une commande
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (order) {
        return {
          message: `📦 **Statut de votre commande #${order.id.substring(0, 8)} :**

📅 **Passée le:** ${new Date(order.created_at).toLocaleDateString('fr-FR')}
💰 **Montant:** ${order.total_amount.toLocaleString()} FCFA
📋 **Statut:** ${this.getOrderStatusText(order.status)}
🚚 **Livraison:** ${this.getDeliveryStatusText(order)}

${this.getOrderNextSteps(order)}`,
          choices: [
            '📱 Contacter le livreur',
            '❓ J\'ai une question',
            '🔄 Modifier ma commande'
          ],
          nextStep: 'order_management' as ConversationStep
        };
      }
    }

    if (customerOrders.length > 0) {
      // Afficher les commandes récentes du client
      const recentOrder = customerOrders[0];
      
      return {
        message: `📦 **Vos commandes récentes :**

**Dernière commande #${recentOrder.id.substring(0, 8)}**
📅 ${new Date(recentOrder.created_at).toLocaleDateString('fr-FR')}
📋 ${this.getOrderStatusText(recentOrder.status)}
💰 ${recentOrder.total_amount.toLocaleString()} FCFA

${customerOrders.length > 1 ? `Et ${customerOrders.length - 1} autre(s) commande(s)` : ''}

Besoin d'infos sur une commande spécifique ?`,
        choices: [
          '📋 Détails de cette commande',
          '📦 Voir toutes mes commandes',
          '🛒 Passer une nouvelle commande'
        ],
        nextStep: 'customer_orders' as ConversationStep
      };
    }

    // Aucune commande trouvée
    return {
      message: `🔍 **Recherche de commande**

Je n'ai pas trouvé de commande pour ce numéro. Voici comment je peux vous aider :

📱 **Avec votre numéro de téléphone** - Je recherche automatiquement
🆔 **Avec votre numéro de commande** - Format #ABC123
📞 **Contact direct** - WhatsApp pour un suivi personnalisé

Avez-vous votre numéro de commande ?`,
      choices: [
        '🆔 J\'ai mon numéro',
        '📱 Chercher avec mon téléphone',
        '📞 Contacter par WhatsApp'
      ],
      nextStep: 'order_search' as ConversationStep
    };
  }

  /**
   * 💬 GESTION DES QUESTIONS GÉNÉRALES
   */
  private async handleGeneralQuestion(
    message: string,
    context: AIContext,
    data: Record<string, any>,
    intent: any
  ): Promise<AIResponse> {
    
    const knowledgeBase = data.knowledgeBase || [];
    const lowerMessage = message.toLowerCase();

    // Recherche dans la base de connaissances
    const relevantKnowledge = knowledgeBase.filter((kb: any) => 
      kb.keywords?.some((keyword: string) => lowerMessage.includes(keyword.toLowerCase()))
    );

    if (relevantKnowledge.length > 0) {
      const knowledge = relevantKnowledge[0];
      return {
        message: `💡 **${knowledge.title}**

${knowledge.content}

Cette information vous aide-t-elle ?`,
        choices: [
          '✅ Parfait, merci !',
          '❓ J\'ai une autre question',
          '🛒 Je veux acheter maintenant'
        ],
        nextStep: 'knowledge_response' as ConversationStep
      };
    }

    // Questions fréquentes sur la marque
    if (lowerMessage.includes('viens on s\'connaît') || lowerMessage.includes('marque') || lowerMessage.includes('qui êtes')) {
      return {
        message: `🌟 **À propos de VIENS ON S'CONNAÎT**

Nous sommes la première marque sénégalaise de jeux de cartes relationnels ! 🇸🇳

🎯 **Notre mission :** Transformer les relations en Afrique, une conversation à la fois
👨‍⚕️ **Notre expertise :** Développés avec des psychologues
✨ **Notre impact :** Plus de 1 000 familles satisfaites

🏆 **Ce qui nous rend uniques :**
• Conçus par et pour les Africains
• Adaptés à nos valeurs familiales
• Paiements mobiles intégrés (Wave, OM)
• Livraison dans 12 pays africains

Comment puis-je vous aider aujourd'hui ?`,
        choices: [
          '🎮 Découvrir vos jeux',
          '📱 Votre application mobile',
          '🛒 Passer une commande'
        ],
        nextStep: 'brand_discovery' as ConversationStep
      };
    }

    // Question sur la livraison
    if (lowerMessage.includes('livraison') || lowerMessage.includes('délai') || lowerMessage.includes('où')) {
      const zones = data.deliveryZones || [];
      
      return {
        message: `🚚 **Informations livraison VIENS ON S'CONNAÎT**

📍 **Nous livrons dans 12 pays africains :**
Sénégal • Mali • Burkina Faso • Côte d'Ivoire • Niger • Guinée • Cameroun • Gabon • Congo • Bénin • Togo • Mauritanie

⏱️ **Délais de livraison :**
• Dakar/Abidjan : 24-48h
• Autres capitales : 3-5 jours
• Autres villes : 5-7 jours

💰 **Frais de livraison :**
• Gratuite dès 15 000 FCFA
• Tarifs préférentiels selon la zone

Dans quelle ville souhaitez-vous être livré(e) ?`,
        choices: [
          '📍 Ma ville est-elle couverte ?',
          '💰 Calculer les frais',
          '🛒 Commander maintenant'
        ],
        nextStep: 'delivery_inquiry' as ConversationStep
      };
    }

    // Réponse générique
    return {
      message: `🤗 **Bonjour ! Je suis Rose, votre conseillère VIENS ON S'CONNAÎT**

Je suis là pour vous aider avec :
• 🎮 Nos jeux de cartes relationnels
• 🛒 Vos commandes et livraisons  
• 📱 Notre application mobile
• ❓ Toutes vos questions

Que puis-je faire pour vous aujourd'hui ?`,
      choices: [
        '🎮 Découvrir vos jeux',
        '🛒 Passer une commande',
        '❓ Poser une question'
      ],
      nextStep: 'initial_contact' as ConversationStep
    };
  }

  /**
   * 🆘 GESTION DES DEMANDES DE SUPPORT
   */
  private async handleSupportRequest(
    message: string,
    context: AIContext,
    data: Record<string, any>,
    intent: any
  ): Promise<AIResponse> {
    
    return {
      message: `🆘 **Support VIENS ON S'CONNAÎT**

Je comprends que vous avez besoin d'aide. Voici vos options :

📱 **WhatsApp (Réponse rapide)**
+221 78 136 27 28

📧 **Email (Réponse sous 24h)**
contact@viensonseconnait.com

💬 **Chat en direct**
Je peux déjà essayer de vous aider ici !

Préférez-vous que je transfère votre demande ou puis-je vous aider directement ?`,
      choices: [
        '💬 M\'aider ici',
        '📱 Transférer vers WhatsApp',
        '📧 Envoyer un email'
      ],
      nextStep: 'support_routing' as ConversationStep,
      actions: ['prepare_support_transfer']
    };
  }

  /**
   * ❓ GESTION DES INTENTIONS NON RECONNUES
   */
  private async handleUnknownIntent(
    message: string,
    context: AIContext,
    data: Record<string, any>
  ): Promise<AIResponse> {
    
    return {
      message: `🤔 **Je ne suis pas sûre d'avoir bien compris...**

Pourriez-vous reformuler votre demande ? Je peux vous aider avec :

🎮 **Nos jeux** - Descriptions, règles, bénéfices
🛒 **Commandes** - Achat, statut, livraison
📱 **App mobile** - Fonctionnalités, téléchargement
❓ **Questions** - Marque, produits, support

Ou dites-moi simplement ce que vous cherchez !`,
      choices: [
        '🎮 Découvrir vos jeux',
        '🛒 Passer commande',
        '📞 Parler à un humain'
      ],
      nextStep: 'clarification' as ConversationStep
    };
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  private detectSubIntent(mainIntent: string, message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    switch (mainIntent) {
      case 'product_inquiry':
        if (lowerMessage.includes('règle') || lowerMessage.includes('comment jouer')) return 'rules';
        if (lowerMessage.includes('bénéfice') || lowerMessage.includes('avantage')) return 'benefits';
        if (lowerMessage.includes('pour qui') || lowerMessage.includes('âge')) return 'target_audience';
        break;
      
      case 'purchase_intent':
        if (lowerMessage.includes('rapide') || lowerMessage.includes('express')) return 'express';
        if (lowerMessage.includes('plusieurs') || lowerMessage.includes('lot')) return 'bulk';
        break;
    }
    
    return undefined;
  }

  private getOrderStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '⏳ En attente de paiement',
      'confirmed': '✅ Confirmée',
      'processing': '📦 En préparation',
      'shipped': '🚚 Expédiée',
      'delivered': '✅ Livrée',
      'cancelled': '❌ Annulée'
    };
    
    return statusMap[status] || '❓ Statut inconnu';
  }

  private getDeliveryStatusText(order: any): string {
    if (order.status === 'delivered') return 'Livraison terminée ✅';
    if (order.status === 'shipped') return 'En cours de livraison 🚚';
    if (order.status === 'processing') return 'Commande en préparation 📦';
    return 'Pas encore expédiée';
  }

  private getOrderNextSteps(order: any): string {
    switch (order.status) {
      case 'pending':
        return '💳 Finalisez votre paiement pour que nous puissions traiter votre commande.';
      case 'confirmed':
        return '📦 Votre commande sera bientôt préparée et expédiée.';
      case 'processing':
        return '🚚 Votre commande sera expédiée dans les 24-48h.';
      case 'shipped':
        return '📱 Le livreur vous contactera pour organiser la réception.';
      case 'delivered':
        return '⭐ N\'hésitez pas à nous laisser un avis sur votre expérience !';
      default:
        return '';
    }
  }

  private formatChatMessage(response: AIResponse, context: AIContext): ChatMessage {
    return {
      type: 'assistant',
      content: response.message,
      choices: response.choices,
      assistant: this.botInfo,
      metadata: {
        nextStep: response.nextStep,
        actions: response.actions,
        sessionId: context.sessionId,
        ...response.metadata
      },
      timestamp: new Date().toISOString()
    };
  }

  private createErrorResponse(context: AIContext): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **Désolée, j'ai rencontré un problème technique.**

Voici vos options :

📞 **Contact immédiat :**
WhatsApp : +221 78 136 27 28

🔄 **Réessayer :**
Reformulez votre demande

Que préférez-vous ?`,
      choices: [
        '🔄 Réessayer',
        '📞 WhatsApp',
        '🏠 Retour accueil'
      ],
      assistant: this.botInfo,
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        sessionId: context.sessionId,
        error: 'true'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎯 MÉTHODE: Recommander des produits personnalisés
   */
  async recommendProducts(
    customerProfile: any,
    currentProductId?: string,
    context?: string
  ): Promise<{ products: any[], reasoning: string }> {
    try {
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('id', currentProductId || '')
        .order('created_at', { ascending: false });

      if (!allProducts || allProducts.length === 0) {
        return {
          products: [],
          reasoning: 'Aucun autre produit disponible pour le moment.'
        };
      }

      // Logique de recommandation basée sur le profil
      let recommendedProducts = allProducts;
      let reasoning = "Voici nos autres jeux qui pourraient vous intéresser :";

      // Si on a des informations sur le client
      if (customerProfile) {
        // Recommandation basée sur l'historique d'achats
        if (customerProfile.previous_purchases) {
          reasoning = "Basé sur vos achats précédents, voici ce que je recommande :";
        }
        
        // Recommandation basée sur l'âge/famille
        if (customerProfile.family_size || context?.includes('famille')) {
          recommendedProducts = allProducts.filter(p => 
            p.target_audience?.includes('famille') || 
            p.category?.includes('famille')
          );
          reasoning = "Pour votre famille, je recommande particulièrement :";
        }
      }

      return {
        products: recommendedProducts.slice(0, 3), // Limiter à 3 recommandations
        reasoning
      };

    } catch (error) {
      console.error('❌ Erreur recommandations:', error);
      return {
        products: [],
        reasoning: 'Erreur lors de la récupération des recommandations.'
      };
    }
  }

  /**
   * 📱 MÉTHODE: Présenter l'application mobile
   */
  async presentMobileApp(context: AIContext): Promise<AIResponse> {
    return {
      message: `📱 **Application VIENS ON S'CONNAÎT**

🎮 **Tous vos jeux dans votre poche !**

✨ **Fonctionnalités exclusives :**
• 🃏 Accès à tous vos jeux achetés
• 🎲 Mode hors-ligne disponible
• 👥 Partage avec famille et amis
• 📊 Suivi de vos sessions de jeu
• 🆕 Nouveaux contenus chaque mois

📲 **Téléchargement gratuit :**
• App Store (iOS)
• Google Play (Android)

🎁 **Bonus:** 50 questions gratuites à l'installation !

L'application vous intéresse-t-elle ?`,
      choices: [
        '📲 Télécharger maintenant',
        '🎮 D\'abord acheter un jeu physique',
        '❓ Comment ça fonctionne ?'
      ],
      nextStep: 'mobile_app_interest' as ConversationStep,
      actions: ['track_app_interest'],
      metadata: {
        appStoreUrl: 'https://apps.apple.com/viensonseconnait',
        playStoreUrl: 'https://play.google.com/store/apps/viensonseconnait'
      }
    };
  }

  /**
   * 💰 MÉTHODE: Calculer et présenter les options de paiement
   */
  async presentPaymentOptions(
    orderAmount: number,
    customerCity: string,
    context: AIContext
  ): Promise<AIResponse> {
    
    // Récupérer les zones de livraison pour calculer les frais
    const { data: deliveryZones } = await supabase
      .from('delivery_zones')
      .select('*');

    const deliveryZone = deliveryZones?.find(zone => 
      zone.cities?.some((city: string) => 
        city.toLowerCase().includes(customerCity.toLowerCase())
      )
    );

    const deliveryFee = deliveryZone?.base_price || 2000;
    const freeDeliveryThreshold = 15000;
    const totalAmount = orderAmount >= freeDeliveryThreshold ? orderAmount : orderAmount + deliveryFee;

    const paymentMethods = [
      {
        name: 'Wave',
        description: 'Paiement mobile instantané',
        fees: 0,
        available: true
      },
      {
        name: 'Orange Money',
        description: 'Paiement mobile sécurisé',
        fees: Math.floor(totalAmount * 0.01), // 1% de frais
        available: customerCity.toLowerCase().includes('sénégal')
      },
      {
        name: 'Carte bancaire',
        description: 'Visa, MasterCard acceptées',
        fees: Math.floor(totalAmount * 0.025), // 2.5% de frais
        available: true
      },
      {
        name: 'Paiement à la livraison',
        description: 'Espèces ou mobile money',
        fees: 500, // Frais de service
        available: deliveryZone?.cash_on_delivery || false
      }
    ];

    const availableMethods = paymentMethods.filter(method => method.available);

    let paymentMessage = `💳 **Options de paiement pour ${totalAmount.toLocaleString()} FCFA**\n\n`;
    
    paymentMessage += `📦 **Votre commande:** ${orderAmount.toLocaleString()} FCFA\n`;
    
    if (orderAmount >= freeDeliveryThreshold) {
      paymentMessage += `🚚 **Livraison:** GRATUITE ✨\n\n`;
    } else {
      paymentMessage += `🚚 **Livraison:** ${deliveryFee.toLocaleString()} FCFA\n\n`;
    }

    paymentMessage += `💰 **Moyens de paiement disponibles:**\n\n`;

    availableMethods.forEach(method => {
      const totalWithFees = totalAmount + method.fees;
      paymentMessage += `${method.name === 'Wave' ? '⭐' : '•'} **${method.name}**\n`;
      paymentMessage += `   ${method.description}\n`;
      if (method.fees > 0) {
        paymentMessage += `   Total: ${totalWithFees.toLocaleString()} FCFA (frais: ${method.fees.toLocaleString()} FCFA)\n`;
      } else {
        paymentMessage += `   Total: ${totalWithFees.toLocaleString()} FCFA ✨\n`;
      }
      paymentMessage += `\n`;
    });

    return {
      message: paymentMessage + "Quel mode de paiement préférez-vous ?",
      choices: availableMethods.map(method => 
        method.fees === 0 ? `✨ ${method.name}` : method.name
      ),
      nextStep: 'payment_selection' as ConversationStep,
      metadata: {
        orderAmount,
        deliveryFee: orderAmount >= freeDeliveryThreshold ? 0 : deliveryFee,
        totalAmount,
        availableMethods,
        freeDeliveryThreshold
      }
    };
  }

  /**
   * 🔄 MÉTHODE: Gérer les modifications de commande
   */
  async handleOrderModification(
    orderId: string,
    modificationType: string,
    context: AIContext
  ): Promise<AIResponse> {
    
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return {
          message: "❌ **Commande introuvable**\n\nImpossible de trouver cette commande. Vérifiez le numéro ou contactez notre support.",
          choices: ['🔍 Vérifier le numéro', '📞 Contacter le support', '🏠 Retour accueil'],
          nextStep: 'order_error' as ConversationStep
        };
      }

      // Vérifier si la modification est possible
      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return {
          message: `⚠️ **Modification impossible**\n\nVotre commande #${order.id.substring(0, 8)} est ${this.getOrderStatusText(order.status)}.\n\nLes modifications ne sont plus possibles à ce stade.`,
          choices: ['📞 Contacter le support', '🆕 Nouvelle commande', '🏠 Retour accueil'],
          nextStep: 'modification_blocked' as ConversationStep
        };
      }

      switch (modificationType) {
        case 'quantity':
          return {
            message: `📦 **Modifier la quantité**\n\nCommande actuelle: ${JSON.parse(order.order_details)[0]?.quantity || 1} jeu(x)\n\nQuelle nouvelle quantité souhaitez-vous ?`,
            choices: ['1 jeu', '2 jeux', '3 jeux', '4 jeux ou plus'],
            nextStep: 'modify_quantity' as ConversationStep,
            metadata: { orderId, currentOrder: order }
          };

        case 'address':
          return {
            message: `📍 **Modifier l'adresse de livraison**\n\nAdresse actuelle: ${order.delivery_address}\n\nVeuillez indiquer votre nouvelle adresse complète :`,
            choices: ['✏️ Saisir nouvelle adresse'],
            nextStep: 'modify_address' as ConversationStep,
            metadata: { orderId, currentOrder: order }
          };

        case 'payment':
          return await this.presentPaymentOptions(
            order.total_amount,
            order.delivery_city || '',
            context
          );

        default:
          return {
            message: `🔧 **Que souhaitez-vous modifier ?**\n\nCommande #${order.id.substring(0, 8)}\nMontant: ${order.total_amount.toLocaleString()} FCFA`,
            choices: ['📦 Quantité', '📍 Adresse', '💳 Paiement', '❌ Annuler commande'],
            nextStep: 'select_modification' as ConversationStep,
            metadata: { orderId, currentOrder: order }
          };
      }

    } catch (error) {
      console.error('❌ Erreur modification commande:', error);
      return {
        message: "😔 **Erreur technique**\n\nUne erreur est survenue lors de la modification. Veuillez réessayer ou nous contacter.",
        choices: ['🔄 Réessayer', '📞 Contacter le support'],
        nextStep: 'modification_error' as ConversationStep
      };
    }
  }

  /**
   * 📊 MÉTHODE: Analyser la conversation pour des insights
   */
  async analyzeConversation(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<{
    customerProfile: any;
    interests: string[];
    buyingIntent: number;
    recommendedActions: string[];
  }> {
    
    const analysis = {
      customerProfile: {
        communicationStyle: 'formal', // formal, casual, mixed
        decisionSpeed: 'moderate', // fast, moderate, slow
        priceConsciousness: 'moderate', // low, moderate, high
        familyOriented: false,
        techSavvy: false
      },
      interests: [] as string[],
      buyingIntent: 0.5, // 0-1 scale
      recommendedActions: [] as string[]
    };

    // Analyser les messages utilisateur
    const userMessages = messages.filter(m => m.type === 'user');
    const allText = userMessages.map(m => m.content.toLowerCase()).join(' ');

    // Analyser le style de communication
    if (allText.includes('s\'il vous plaît') || allText.includes('merci')) {
      analysis.customerProfile.communicationStyle = 'formal';
    } else if (allText.includes('salut') || allText.includes('😊')) {
      analysis.customerProfile.communicationStyle = 'casual';
    }

    // Analyser la vitesse de décision
    if (allText.includes('rapidement') || allText.includes('maintenant') || allText.includes('vite')) {
      analysis.customerProfile.decisionSpeed = 'fast';
      analysis.buyingIntent += 0.2;
    }

    // Analyser la sensibilité au prix
    if (allText.includes('prix') || allText.includes('coût') || allText.includes('cher')) {
      analysis.customerProfile.priceConsciousness = 'high';
      analysis.buyingIntent -= 0.1;
    }

    // Analyser l'orientation familiale
    if (allText.includes('famille') || allText.includes('enfant') || allText.includes('mari') || allText.includes('épouse')) {
      analysis.customerProfile.familyOriented = true;
      analysis.interests.push('family_games');
    }

    // Analyser l'intention d'achat
    const buyingKeywords = ['acheter', 'commander', 'prendre', 'veux', 'intéresse'];
    const buyingMentions = buyingKeywords.filter(keyword => allText.includes(keyword)).length;
    analysis.buyingIntent += Math.min(0.4, buyingMentions * 0.1);

    // Générer des recommandations d'actions
    if (analysis.buyingIntent > 0.7) {
      analysis.recommendedActions.push('propose_immediate_purchase');
      analysis.recommendedActions.push('show_social_proof');
    } else if (analysis.buyingIntent > 0.4) {
      analysis.recommendedActions.push('address_concerns');
      analysis.recommendedActions.push('show_testimonials');
    } else {
      analysis.recommendedActions.push('educate_about_benefits');
      analysis.recommendedActions.push('build_trust');
    }

    if (analysis.customerProfile.familyOriented) {
      analysis.recommendedActions.push('highlight_family_benefits');
    }

    if (analysis.customerProfile.priceConsciousness === 'high') {
      analysis.recommendedActions.push('justify_value');
      analysis.recommendedActions.push('mention_guarantees');
    }

    return analysis;
  }

  /**
   * 🎯 MÉTHODE: Générer une réponse contextuelle intelligente
   */
  async generateContextualResponse(
    userMessage: string,
    context: AIContext,
    conversationAnalysis: any
  ): Promise<AIResponse> {
    
    const data = await this.gatherContextualData(context, { type: 'contextual' });
    const product = data.currentProduct;
    
    // Adapter la réponse selon le profil du client
    let tone = conversationAnalysis.customerProfile.communicationStyle === 'formal' ? 'professional' : 'friendly';
    let urgency = conversationAnalysis.customerProfile.decisionSpeed === 'fast' ? 'high' : 'moderate';
    
    // Construire une réponse personnalisée
    let response = '';
    let choices: string[] = [];
    let nextStep: ConversationStep = 'contextual_response';

    if (conversationAnalysis.buyingIntent > 0.7) {
      // Client très intéressé - pousser vers l'achat
      response = tone === 'professional' ? 
        `🎯 **Je vois que ${product?.name} vous intéresse vraiment !**\n\n` :
        `🎯 **Super ! ${product?.name} est exactement ce qu'il vous faut !**\n\n`;
      
      if (urgency === 'high') {
        response += `⚡ **Commande express disponible** - Finalisez en moins d'1 minute !\n\n`;
        choices = ['⚡ Commander maintenant', '❓ Une dernière question', '💰 Voir les prix'];
      } else {
        response += `${product?.description || 'Ce jeu transformera vos relations.'}\n\n`;
        choices = ['🛒 Je veux l\'acheter', '❓ J\'ai une question', '⭐ Voir les avis'];
      }
      
    } else if (conversationAnalysis.buyingIntent > 0.4) {
      // Client moyennement intéressé - lever les objections
      response = `💡 **${product?.name} semble vous intéresser.**\n\n`;
      
      if (conversationAnalysis.customerProfile.priceConsciousness === 'high') {
        response += `💰 **Excellent rapport qualité-prix :** ${product?.price.toLocaleString()} FCFA pour transformer vos relations !\n\n`;
        response += `✨ **Garantie satisfait ou remboursé 30 jours**\n\n`;
      }
      
      choices = ['💝 Quels bénéfices exactement ?', '⭐ Avis clients', '🛒 Je veux l\'essayer'];
      
    } else {
      // Client peu intéressé - éduquer et créer l'intérêt
      response = `🌟 **Laissez-moi vous expliquer pourquoi ${product?.name} est spécial.**\n\n`;
      response += `✨ **Plus de 1 000 familles africaines** ont déjà transformé leurs relations avec nos jeux !\n\n`;
      
      if (conversationAnalysis.customerProfile.familyOriented) {
        response += `👨‍👩‍👧‍👦 **Parfait pour renforcer les liens familiaux** et créer des souvenirs précieux.\n\n`;
      }
      
      choices = ['🎮 Comment ça marche ?', '💝 Quels bénéfices ?', '⭐ Témoignages'];
    }

    // Ajouter la preuve sociale si pertinente
    if (data.recentSalesCount > 0) {
      response += `🔥 **${data.recentSalesCount} personnes ont commandé ce mois-ci !**\n\n`;
    }

    return {
      message: response + "Que souhaitez-vous faire ?",
      choices,
      nextStep,
      metadata: {
        personalizedResponse: true,
        buyingIntent: conversationAnalysis.buyingIntent,
        customerProfile: conversationAnalysis.customerProfile
      }
    };
  }
}