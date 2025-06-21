// src/lib/services/RoseAIEngine.ts
import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ConversationStep, 
  ProductData, 
  ProductRecommendation 
} from '@/types/chat';

interface RoseContext {
  productId: string;
  sessionId: string;
  userMessage: string;
  conversationHistory: ChatMessage[];
  currentStep: ConversationStep;
  visitSource?: string;
  timeOnPage?: number;
  orderData?: any;
}

interface RoseResponse {
  message: string;
  choices: string[];
  nextStep: ConversationStep;
  intent: 'buy' | 'question' | 'info' | 'hesitant' | 'objection' | 'support';
  confidence: number;
  productRecommendations?: ProductRecommendation[];
  upsellSuggestion?: ProductRecommendation;
  actions?: {
    showCart?: boolean;
    showProduct?: boolean;
    triggerUpsell?: boolean;
    showTestimonials?: boolean;
    redirectWhatsApp?: boolean;
  };
  metadata?: any;
}

export class RoseAIEngine {
  private static instance: RoseAIEngine;
  private openaiApiKey: string;
  private claudeApiKey?: string;
  private productDatabase: Map<string, ProductData> = new Map();
  private gameKnowledge: Map<string, any> = new Map();

  private constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
    this.initializeProductDatabase();
  }

  public static getInstance(): RoseAIEngine {
    if (!this.instance) {
      this.instance = new RoseAIEngine();
    }
    return this.instance;
  }

  // 🎯 MÉTHODE PRINCIPALE - TRAITEMENT DES MESSAGES
  async processCustomerMessage(context: RoseContext): Promise<RoseResponse> {
    try {
      console.log('🌹 Rose AI processing:', {
        message: context.userMessage.substring(0, 50),
        step: context.currentStep,
        intent: this.detectIntent(context.userMessage)
      });

      // 1. Détecter l'intention du client
      const intent = this.detectIntent(context.userMessage);
      const confidence = this.calculateConfidence(context.userMessage, intent);

      // 2. Récupérer les données produit
      const product = await this.getProductData(context.productId);
      if (!product) {
        return this.createErrorResponse('Produit non trouvé');
      }

      // 3. Générer la réponse selon l'intention
      let response: RoseResponse;

      switch (intent) {
        case 'buy':
          response = await this.handleBuyingIntent(context, product);
          break;
        case 'question':
          response = await this.handleQuestionIntent(context, product);
          break;
        case 'info':
          response = await this.handleInfoRequest(context, product);
          break;
        case 'hesitant':
          response = await this.handleHesitation(context, product);
          break;
        case 'objection':
          response = await this.handleObjection(context, product);
          break;
        default:
          response = await this.generateAIResponse(context, product);
      }

      // 4. Ajouter recommandations si pertinent
      if (this.shouldShowRecommendations(intent, context)) {
        response.productRecommendations = await this.generateRecommendations(
          context.productId, 
          intent, 
          context.conversationHistory
        );
      }

      return response;

    } catch (error) {
      console.error('❌ Rose AI Error:', error);
      return this.createErrorResponse('Une erreur est survenue');
    }
  }

  // 🧠 DÉTECTION D'INTENTION AVANCÉE
  private detectIntent(message: string): RoseResponse['intent'] {
    const lowerMessage = message.toLowerCase();
    
    // Intentions d'achat immédiat
    const buyKeywords = [
      'acheter', 'commander', 'prendre', 'veux', 'want', 'buy',
      'maintenant', 'rapidement', 'express', 'direct', 'tout de suite'
    ];
    
    // Questions sur le produit
    const questionKeywords = [
      'comment', 'pourquoi', 'quand', 'où', 'qui', 'quoi',
      'expliquer', 'marche', 'fonctionne', 'règles', 'jouer'
    ];
    
    // Demande d'informations
    const infoKeywords = [
      'détails', 'présentation', 'description', 'caractéristiques',
      'contenu', 'plus d\'infos', 'en savoir plus', 'tell me more'
    ];
    
    // Hésitation
    const hesitantKeywords = [
      'pas sûr', 'hésit', 'peut-être', 'réfléchir', 'voir',
      'not sure', 'thinking', 'maybe', 'hesitat'
    ];
    
    // Objections
    const objectionKeywords = [
      'cher', 'prix', 'coût', 'expensive', 'pas convaincu',
      'doute', 'sceptique', 'pas certain', 'worth it'
    ];

    if (buyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'buy';
    }
    if (questionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'question';
    }
    if (infoKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'info';
    }
    if (hesitantKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'hesitant';
    }
    if (objectionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'objection';
    }

    return 'question'; // Par défaut
  }

  // 💰 GESTION DES INTENTIONS D'ACHAT
  private async handleBuyingIntent(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    return {
      message: `🎉 **Parfait !** Je vais vous aider à commander **${product.name}**.\n\nC'est parti pour une commande express ! ⚡`,
      choices: ['Commander maintenant'],
      nextStep: 'express_quantity',        // ✅ CORRIGÉ: utilise le step correct
      intent: 'buy',
      confidence: 0.95,
      actions: {
        showCart: true,
        triggerUpsell: false
      }
    };
  }

  // ❓ GESTION DES QUESTIONS
  private async handleQuestionIntent(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    const answer = await this.generateSmartAnswer(context.userMessage, product);
    
    return {
      message: answer,
      choices: [
        'Je veux l\'acheter maintenant',
        'Autre question',
        'En savoir plus sur le jeu'
      ],
      nextStep: 'conversation',
      intent: 'question',
      confidence: 0.8
    };
  }

  // 📋 GESTION DES DEMANDES D'INFO
  private async handleInfoRequest(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    const description = this.formatProductDescription(product);
    
    return {
      message: `📋 **Voici tout ce qu'il faut savoir sur ${product.name} :**\n\n${description}`,
      choices: [
        'Comment y jouer ?',
        'Voir les témoignages',
        'Je veux l\'acheter'
      ],
      nextStep: 'product_info',
      intent: 'info',
      confidence: 0.9
    };
  }

  // 🤔 GESTION DE L'HÉSITATION
  private async handleHesitation(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    const testimonials = await this.getProductTestimonials(product.id);
    const socialProof = `👥 **Déjà ${product.sales_count || 0} personnes** ont choisi ce jeu !`;
    
    return {
      message: `Je comprends votre hésitation ! 😊\n\n${socialProof}\n\n💬 **Voici ce que disent nos clients :**\n"${testimonials[0]?.content || 'Ce jeu a transformé nos soirées en famille !'}"`,
      choices: [
        'Convaincant ! Je l\'achète',
        'J\'ai encore des questions',
        'Montrez-moi d\'autres avis'
      ],
      nextStep: 'objection_handling',     // ✅ CORRIGÉ: utilise un step valide
      intent: 'hesitant',
      confidence: 0.85,
      actions: {
        showTestimonials: true
      }
    };
  }

  // 🛡️ GESTION DES OBJECTIONS
  private async handleObjection(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    const valueProposition = this.createValueProposition(product);
    
    return {
      message: `Je comprends vos préoccupations ! 💡\n\n${valueProposition}\n\n🎁 **Bonus :** Si vous commandez aujourd'hui, la livraison est offerte à Dakar !`,
      choices: [
        'C\'est convaincant, je commande',
        'Comparer avec d\'autres jeux',
        'Parler à un conseiller'
      ],
      nextStep: 'objection_handling',     // ✅ CORRIGÉ: utilise un step valide
      intent: 'objection',
      confidence: 0.8
    };
  }

  // 🤖 GÉNÉRATION DE RÉPONSE IA AVEC GPT-4
  private async generateAIResponse(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(product);
      const userPrompt = this.buildUserPrompt(context);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0]?.message?.content || 'Je peux vous aider avec ce jeu !';

      return {
        message: aiMessage,
        choices: [
          'Je veux l\'acheter maintenant',
          'Autre question',
          'Parler à un conseiller'
        ],
        nextStep: 'conversation',
        intent: 'question',
        confidence: 0.75
      };

    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      
      // Fallback vers Claude AI si disponible
      if (this.claudeApiKey) {
        return await this.generateClaudeResponse(context, product);
      }
      
      // Fallback vers réponse prédéfinie
      return this.generateFallbackResponse(context, product);
    }
  }

  // 🔄 FALLBACK CLAUDE AI
  private async generateClaudeResponse(context: RoseContext, product: ProductData): Promise<RoseResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(product);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.claudeApiKey!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\nClient: ${context.userMessage}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.content[0]?.text || 'Je peux vous aider avec ce jeu !';

      return {
        message: aiMessage,
        choices: [
          'Je veux l\'acheter maintenant',
          'Autre question',
          'Parler à un conseiller'
        ],
        nextStep: 'conversation',
        intent: 'question',
        confidence: 0.7
      };

    } catch (error) {
      console.error('❌ Claude API Error:', error);
      return this.generateFallbackResponse(context, product);
    }
  }

  // 🔧 MÉTHODES UTILITAIRES
  private buildSystemPrompt(product: ProductData): string {
    return `Tu es Rose, l'assistante d'achat experte de VIENS ON S'CONNAÎT, une marque de jeux de cartes relationnels créée au Sénégal.

PRODUIT ACTUEL: ${product.name}
DESCRIPTION: ${product.description}
PRIX: ${product.price} FCFA

TU ES:
- Une vendeuse expérimentée et empathique
- Experte en jeux de cartes relationnels
- Focalisée sur la conversion et la satisfaction client
- Capable de répondre en français et en anglais
- Toujours positive et encourageante

TON OBJECTIF: Aider le client à acheter ce jeu en répondant à ses questions et en dissipant ses doutes.

RÈGLES:
- Réponses courtes et engageantes (maximum 3 phrases)
- Utilise des emojis pour rendre les réponses vivantes
- Mets l'accent sur les bénéfices émotionnels des jeux
- Propose toujours des actions concrètes
- Si tu ne sais pas quelque chose, redirige vers WhatsApp
- Reste toujours professionnelle et bienveillante`;
  }

  private buildUserPrompt(context: RoseContext): string {
    const history = context.conversationHistory
      .slice(-3) // Derniers 3 messages pour le contexte
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n');

    return `CONTEXTE DE CONVERSATION:
${history}

MESSAGE ACTUEL DU CLIENT: ${context.userMessage}

TEMPS PASSÉ SUR LA PAGE: ${context.timeOnPage || 0} secondes
SOURCE: ${context.visitSource || 'direct'}

Réponds de manière personnalisée et orientée vente.`;
  }

  private calculateConfidence(message: string, intent: string): number {
    // Logique simple de calcul de confiance
    const certainWords = ['oui', 'yes', 'absolument', 'certainement', 'sûr'];
    const uncertainWords = ['peut-être', 'maybe', 'not sure', 'hésite'];
    
    if (certainWords.some(word => message.toLowerCase().includes(word))) {
      return 0.9;
    }
    if (uncertainWords.some(word => message.toLowerCase().includes(word))) {
      return 0.4;
    }
    return 0.7;
  }

  private shouldShowRecommendations(intent: string, context: RoseContext): boolean {
    return intent === 'hesitant' || 
           intent === 'info' || 
           context.conversationHistory.length > 3;
  }

  private async generateRecommendations(
    productId: string, 
    intent: string, 
    history: ChatMessage[]
  ): Promise<ProductRecommendation[]> {
    // Appel à l'API de recommandations existante
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          context: { intent, historyLength: history.length }
        })
      });
      
      const data = await response.json();
      return data.recommendations || [];
    } catch (error) {
      console.error('❌ Recommendations error:', error);
      return [];
    }
  }

  private formatProductDescription(product: ProductData): string {
    return `🎯 **${product.name}**\n\n${product.description}\n\n💰 **Prix :** ${product.price} FCFA\n🚚 **Livraison :** Disponible dans toute l'Afrique\n⭐ **Note :** ${product.rating || 4.8}/5`;
  }

  private createValueProposition(product: ProductData): string {
    return `✨ **Pourquoi choisir ${product.name} ?**\n\n🎯 Des conversations plus profondes avec vos proches\n💝 Un investissement dans vos relations\n🌟 ${product.sales_count || 0}+ personnes satisfaites\n⚡ Livraison rapide et sécurisée`;
  }

  private generateFallbackResponse(context: RoseContext, product: ProductData): RoseResponse {
    return {
      message: `Merci pour votre question sur **${product.name}** ! 😊\n\nJe suis là pour vous aider à découvrir ce magnifique jeu qui va transformer vos moments ensemble.\n\nQue souhaitez-vous savoir exactement ?`,
      choices: [
        'Comment ça marche ?',
        'Je veux l\'acheter',
        'Voir les avis clients'
      ],
      nextStep: 'conversation',
      intent: 'question',
      confidence: 0.6
    };
  }

  private createErrorResponse(errorMessage: string): RoseResponse {
    return {
      message: `Désolée, ${errorMessage} 😔\n\nPuis-je vous aider autrement ?`,
      choices: [
        'Contacter un conseiller',
        'Recommencer',
        'Voir d\'autres jeux'
      ],
      nextStep: 'error_recovery',
      intent: 'support',
      confidence: 0.5
    };
  }

  // 📊 MÉTHODES D'INITIALISATION ET DE DONNÉES
  private async initializeProductDatabase(): Promise<void> {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*');
      
      if (products) {
        products.forEach(product => {
          this.productDatabase.set(product.id, product);
        });
      }
    } catch (error) {
      console.error('❌ Product database initialization error:', error);
    }
  }

  private async getProductData(productId: string): Promise<ProductData | null> {
    // Vérifier le cache local d'abord
    if (this.productDatabase.has(productId)) {
      return this.productDatabase.get(productId)!;
    }

    // Sinon récupérer depuis Supabase
    try {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (product) {
        this.productDatabase.set(productId, product);
        return product;
      }
    } catch (error) {
      console.error('❌ Product fetch error:', error);
    }

    return null;
  }

  private async getProductTestimonials(productId: string): Promise<any[]> {
    try {
      const { data: testimonials } = await supabase
        .from('testimonials')
        .select('*')
        .eq('product_id', productId)
        .limit(3);

      return testimonials || [];
    } catch (error) {
      console.error('❌ Testimonials fetch error:', error);
      return [
        { content: 'Ce jeu a transformé nos soirées en famille !' },
        { content: 'Parfait pour créer des liens plus forts.' }
      ];
    }
  }

  private async generateSmartAnswer(question: string, product: ProductData): Promise<string> {
    // Base de connaissances statique pour les questions fréquentes
    const faq = {
      'comment jouer': `🎮 **Comment jouer à ${product.name} :**\n\n${product.game_rules || 'C\'est très simple ! Tirez une carte et suivez les instructions pour créer de beaux moments ensemble.'}`,
      'livraison': '🚚 **Livraison :** Nous livrons dans toute l\'Afrique ! Livraison gratuite à Dakar, 2-5 jours ouvrés ailleurs.',
      'prix': `💰 **Prix :** ${product.price} FCFA - Un investissement pour des relations plus fortes !`,
      'garantie': '✅ **Garantie :** Satisfait ou remboursé sous 30 jours !',
      'paiement': '💳 **Paiement :** Wave, Carte bancaire ou Paiement à la livraison (Dakar uniquement)'
    };

    const lowerQuestion = question.toLowerCase();
    
    for (const [key, answer] of Object.entries(faq)) {
      if (lowerQuestion.includes(key)) {
        return answer;
      }
    }

    // Si pas de correspondance, réponse générique encourageante
    return `Excellente question ! 😊\n\nPour **${product.name}**, voici ce qui vous attend : des moments uniques et des conversations authentiques avec vos proches.\n\nAvez-vous une question plus spécifique ?`;
  }
}