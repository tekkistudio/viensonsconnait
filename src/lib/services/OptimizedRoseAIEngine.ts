// src/lib/services/OptimizedRoseAIEngine.ts - VERSION CORRIGÉE TypeScript
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ProductData, ConversationStep } from '@/types/chat';

interface RoseContext {
  sessionId: string;
  productId: string;
  userMessage: string;
  currentStep: ConversationStep;
  conversationHistory: ChatMessage[];
  visitSource?: string;
  timeOnPage?: number;
}

interface RoseResponse {
  message: string;
  choices: string[];
  nextStep: ConversationStep;
  intent: string;
  confidence: number;
  actions?: {
    showCart?: boolean;
    triggerUpsell?: boolean;
    showTestimonials?: boolean;
    redirectWhatsApp?: boolean;
  };
  metadata?: {
    orderData?: any;
    [key: string]: any;
  };
}

// ✅ INTERFACE ÉTENDUE POUR PRODUIT AVEC STOCK
interface ProductDataWithStock extends ProductData {
  stock_available?: boolean;
  stock_quantity: number; // ✅ OBLIGATOIRE maintenant
}

export class OptimizedRoseAIEngine {
  private static instance: OptimizedRoseAIEngine;
  private productCache = new Map<string, ProductDataWithStock>();
  private knowledgeCache = new Map<string, any[]>();

  private constructor() {
    console.log('🌹 OptimizedRoseAIEngine initialized with Supabase functions');
  }

  public static getInstance(): OptimizedRoseAIEngine {
    if (!this.instance) {
      this.instance = new OptimizedRoseAIEngine();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE OPTIMISÉE
  async processCustomerMessage(context: RoseContext): Promise<RoseResponse> {
    try {
      console.log('🌹 Processing customer message:', context.userMessage);

      // 1. Charger les données du produit avec vérification de stock
      const product = await this.getProductWithStock(context.productId);
      if (!product) {
        return this.createErrorResponse('Produit non trouvé');
      }

      // 2. Incrémenter les vues produit (utilise votre fonction existante)
      await this.incrementProductViews(context.productId);

      // 3. Analyser l'intention de l'utilisateur
      const intent = this.analyzeUserIntent(context.userMessage);

      // 4. Générer la réponse appropriée
      return await this.generateResponse(context, product, intent);

    } catch (error) {
      console.error('❌ Error in processCustomerMessage:', error);
      return this.createErrorResponse('Erreur lors du traitement de votre demande');
    }
  }

  // ✅ RÉCUPÉRATION PRODUIT AVEC STOCK (utilise votre fonction)
  private async getProductWithStock(productId: string): Promise<ProductDataWithStock | null> {
    if (this.productCache.has(productId)) {
      return this.productCache.get(productId)!;
    }

    try {
      // Récupérer les données du produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ Error fetching product:', productError);
        return null;
      }

      // ✅ CORRECTION: Créer un objet avec stock_quantity défini
      const productWithStock: ProductDataWithStock = {
        ...product,
        stock_quantity: product.stock_quantity || 0 // ✅ Valeur par défaut
      };

      // ✅ UTILISER VOTRE FONCTION check_stock_availability si disponible
      try {
        const { data: stockData, error: stockError } = await supabase
          .rpc('check_stock_availability', { product_id: productId });

        if (!stockError && stockData) {
          productWithStock.stock_available = stockData.available;
          productWithStock.stock_quantity = stockData.quantity || 0;
        }
      } catch (stockError) {
        console.warn('❌ Stock check not available:', stockError);
        // Continuer sans vérification de stock
      }

      this.productCache.set(productId, productWithStock);
      return productWithStock;
    } catch (error) {
      console.error('❌ Product fetch error:', error);
      return null;
    }
  }

  // ✅ INCRÉMENTER LES VUES (utilise votre fonction)
  private async incrementProductViews(productId: string): Promise<void> {
    try {
      await supabase.rpc('increment_product_views', { 
        product_id: productId 
      });
    } catch (error) {
      console.error('❌ Error incrementing views:', error);
    }
  }

  // ✅ GÉNÉRATION DE LA RÉPONSE INITIALE
  generateInitialWelcome(product: ProductDataWithStock): RoseResponse {
    return {
      message: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.\n\nJe vois que vous vous intéressez à notre jeu **${product.name}** ! C'est excellent ✨\n\nComment puis-je vous aider ?`,
      choices: [
        'Je veux l\'acheter maintenant',
        'J\'ai des questions à poser',
        'Je veux en savoir plus'
      ],
      nextStep: 'initial_engagement',
      intent: 'welcome',
      confidence: 1.0
    };
  }

  // ✅ GESTION DES QUESTIONS
  private async handleQuestions(context: RoseContext, product: ProductDataWithStock): Promise<RoseResponse> {
    return {
      message: `Parfait ! Posez-moi toutes vos questions. Je peux vous expliquer :\n\n• Comment jouer à ce jeu\n• Pour qui ce jeu est adapté\n• Les bénéfices que vous pouvez en tirer\n• Ce qu'en disent nos clients\n• Ou n'importe quelle autre question\n\nQue voulez-vous savoir ?`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui ?',
        'Quels sont les bénéfices ?',
        'Quels sont les avis clients ?'
      ],
      nextStep: 'question_mode',
      intent: 'information_seeking',
      confidence: 0.9
    };
  }

  // ✅ RÉPONSE BASÉE SUR LA BASE DE DONNÉES
  private async answerSpecificQuestion(questionType: string, product: ProductDataWithStock): Promise<RoseResponse> {
    try {
      switch (questionType.toLowerCase()) {
        case 'comment y jouer ?':
        case 'comment jouer':
          const gameRules = product.game_rules || 'Très simple ! Piochez une carte et posez la question à votre partenaire. Écoutez attentivement sa réponse et partagez la vôtre. C\'est tout ! 😊';
          
          return {
            message: `🎮 **Comment jouer à ${product.name} :**\n\n${gameRules}\n\nEst-ce que cela répond à votre question ?`,
            choices: [
              'Oui, merci !',
              'J\'ai une autre question',
              'Je veux l\'acheter maintenant'
            ],
            nextStep: 'post_rules_engagement',
            intent: 'game_rules_explained',
            confidence: 0.9
          };

        case 'c\'est pour qui ?':
        case 'pour qui':
          // ✅ CORRECTION: Utilisation sécurisée de extractFromMetadata
          const targetAudience = this.extractFromMetadata(product, 'target_audience') || 
                                 '• Les couples qui veulent se redécouvrir\n• Les amis qui souhaitent approfondir leurs liens\n• Les familles pour des moments complices\n• Toute personne curieuse de mieux connaître ses proches';
          
          return {
            message: `👥 **${product.name} est parfait pour :**\n\n${targetAudience}\n\nVous vous reconnaissez ?`,
            choices: [
              'Oui, c\'est pour moi !',
              'J\'ai une autre question',
              'Je veux l\'acheter maintenant'
            ],
            nextStep: 'target_audience_shown',
            intent: 'target_audience_explained',
            confidence: 0.9
          };

        case 'quels sont les bénéfices ?':
        case 'bénéfices':
          const benefits = this.extractFromMetadata(product, 'benefits') || 
                          '• Conversations plus profondes et authentiques\n• Liens renforcés avec vos proches\n• Moments de complicité mémorables\n• Découverte de nouvelles facettes chez l\'autre\n• Communication bienveillante et sans jugement';
          
          return {
            message: `💝 **Les bénéfices de ${product.name} :**\n\n${benefits}\n\nC'est exactement ce que vous recherchez ?`,
            choices: [
              'Exactement !',
              'J\'ai une autre question',
              'Je veux l\'acheter maintenant'
            ],
            nextStep: 'benefits_shown',
            intent: 'benefits_explained',
            confidence: 0.9
          };

        case 'quels sont les avis clients ?':
        case 'avis clients':
        case 'témoignages':
          const testimonials = await this.getTestimonialsFromTables(product.id);
          const testimonialsText = testimonials.length > 0 
            ? testimonials.slice(0, 3).map(t => `"${t.content}" - ${t.author_name || t.author || 'Client vérifié'}`).join('\n\n')
            : '"Ce jeu a transformé nos soirées en famille !" - Marie\n\n"Parfait pour créer des liens plus forts." - David\n\n"Nos conversations sont devenues tellement plus riches !" - Aïcha';

          return {
            message: `⭐ **Ce que disent nos clients :**\n\n${testimonialsText}\n\nComme eux, prêt(e) à transformer vos relations ?`,
            choices: [
              'Oui, je commande !',
              'J\'ai une autre question',
              'Voir plus d\'avis'
            ],
            nextStep: 'testimonials_shown',
            intent: 'testimonials_shown',
            confidence: 0.9,
            actions: { showTestimonials: true }
          };

        default:
          return this.createGeneralResponse(product);
      }
    } catch (error) {
      console.error('❌ Error answering specific question:', error);
      return this.createGeneralResponse(product);
    }
  }

  // ✅ GESTION "EN SAVOIR PLUS"
  private async handleLearnMore(product: ProductDataWithStock): Promise<RoseResponse> {
    const description = product.description || `${product.name} est un jeu de cartes innovant qui vous permet de créer des moments de connexion authentique avec vos proches.`;

    return {
      message: `📖 **Découvrez ${product.name} :**\n\n${description}\n\n🎯 **En résumé :** Un jeu simple et puissant pour des conversations qui comptent vraiment.\n\nEst-ce que cela vous donne envie de l'essayer ?`,
      choices: [
        'Oui, je le veux !',
        'J\'ai des questions',
        'Voir les avis clients'
      ],
      nextStep: 'product_info_shown',
      intent: 'product_description_shown',
      confidence: 0.9
    };
  }

  // ✅ MÉTHODES UTILITAIRES
  private analyzeUserIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('acheter') || lowerMessage.includes('commander') || lowerMessage.includes('maintenant')) {
      return 'purchase_intent';
    }
    if (lowerMessage.includes('question') || lowerMessage.includes('?')) {
      return 'information_seeking';
    }
    if (lowerMessage.includes('savoir plus') || lowerMessage.includes('détails')) {
      return 'product_exploration';
    }
    if (lowerMessage.includes('jouer') || lowerMessage.includes('comment')) {
      return 'usage_inquiry';
    }
    if (lowerMessage.includes('avis') || lowerMessage.includes('témoignage')) {
      return 'social_proof_seeking';
    }
    
    return 'general_inquiry';
  }

  private async generateResponse(context: RoseContext, product: ProductDataWithStock, intent: string): Promise<RoseResponse> {
    const message = context.userMessage.toLowerCase();

    // Gestion spécifique des boutons
    if (message === 'je veux l\'acheter maintenant') {
      return this.triggerExpressPurchase(product);
    }
    if (message === 'j\'ai des questions à poser') {
      return await this.handleQuestions(context, product);
    }
    if (message === 'je veux en savoir plus') {
      return await this.handleLearnMore(product);
    }

    // Gestion des questions spécifiques
    if (message.includes('comment y jouer') || message.includes('comment jouer')) {
      return await this.answerSpecificQuestion('comment y jouer ?', product);
    }
    if (message.includes('c\'est pour qui') || message.includes('pour qui')) {
      return await this.answerSpecificQuestion('c\'est pour qui ?', product);
    }
    if (message.includes('bénéfices') || message.includes('avantages')) {
      return await this.answerSpecificQuestion('quels sont les bénéfices ?', product);
    }
    if (message.includes('avis') || message.includes('témoignage')) {
      return await this.answerSpecificQuestion('quels sont les avis clients ?', product);
    }

    // Réponse générale
    return this.createGeneralResponse(product);
  }

  private triggerExpressPurchase(product: ProductDataWithStock): RoseResponse {
    // ✅ CORRECTION: Vérification sécurisée du stock
    if (product.stock_quantity <= 0) {
      return {
        message: `😔 **Désolée, ${product.name} est actuellement en rupture de stock.**\n\nNous travaillons à le remettre en stock rapidement.\n\nQue souhaitez-vous faire ?`,
        choices: [
          '🔔 Me prévenir quand disponible',
          '📱 Contacter le support',
          '👀 Voir d\'autres jeux'
        ],
        nextStep: 'out_of_stock',
        intent: 'stock_unavailable',
        confidence: 1.0
      };
    }

    return {
      message: 'Parfait ! Je vais vous guider pour passer votre commande rapidement. 🚀',
      choices: [],
      nextStep: 'express_quantity',
      intent: 'express_purchase',
      confidence: 1.0,
      actions: { showCart: true },
      metadata: {
        orderData: {
          expressMode: true,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          maxQuantity: Math.min(product.stock_quantity, 10)
        }
      }
    };
  }

  private createGeneralResponse(product: ProductDataWithStock): RoseResponse {
    return {
      message: `Je suis là pour vous aider avec le jeu **${product.name}** ! 😊\n\nQue souhaitez-vous savoir exactement ?`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui ?',
        'Quels sont les bénéfices ?',
        'Je veux l\'acheter'
      ],
      nextStep: 'question_mode',
      intent: 'general_help',
      confidence: 0.7
    };
  }

  private createErrorResponse(errorMessage: string): RoseResponse {
    return {
      message: `Désolée, ${errorMessage} 😔\n\nPuis-je vous aider autrement ?`,
      choices: [
        'Recommencer',
        'Contacter le support',
        'Voir d\'autres jeux'
      ],
      nextStep: 'error_recovery',
      intent: 'error',
      confidence: 0.5
    };
  }

  // ✅ MÉTHODES UTILITAIRES POUR EXTRAIRE LES DONNÉES (CORRIGÉES)
  private extractFromMetadata(product: ProductDataWithStock, key: string): string | null {
    try {
      // ✅ CORRECTION: Vérification stricte des propriétés
      
      // Vérifier d'abord les chatbot_variables
      if (product.chatbot_variables && typeof product.chatbot_variables === 'object' && product.chatbot_variables[key]) {
        return product.chatbot_variables[key];
      }
      
      // Puis le metadata général
      if (product.metadata && typeof product.metadata === 'object' && product.metadata[key]) {
        return product.metadata[key];
      }
      
      // ✅ CORRECTION: Utilisation de type assertion pour l'accès dynamique
      const productAny = product as any;
      if (productAny[key]) {
        return productAny[key];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting metadata:', error);
      return null;
    }
  }

  private async getTestimonialsFromTables(productId: string): Promise<any[]> {
    try {
      // Essayer les différentes tables de témoignages
      const tables = ['testimonials', 'product_testimonials', 'reviews'];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('content, author, author_name, rating')
            .eq('product_id', productId)
            .limit(3);
          
          if (!error && data && data.length > 0) {
            return data;
          }
        } catch (tableError) {
          console.log(`Table ${table} not available, trying next...`);
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching testimonials:', error);
      return [];
    }
  }
}