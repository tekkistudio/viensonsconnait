// src/lib/services/AIResponseHandler.ts - VERSION CORRIGÉE
import type { ChatMessage, ConversationStep } from '@/types/chat';
import DynamicContentService from './DynamicContentService';
import PersuasiveAIService from './PersuasiveAIService';
import { supabase } from '@/lib/supabase';

interface AIResponseContext {
  productId: string;
  productName: string;
  sessionId: string;
  isExpressMode: boolean;
  currentStep?: ConversationStep;
  userMessage: string;
  conversationHistory: ChatMessage[];
}

interface UserIntent {
  type: string;
  confidence: number;
  keywords: string[];
  details?: any;
}

interface PersuasionContext {
  userMessage: string;
  productId: string;
  productName: string;
  userIntent: 'browsing' | 'interested' | 'considering' | 'ready_to_buy';
  concerns: string[];
  interests: string[];
  messageCount: number;
  priceRange?: number;
}

// ✅ CORRECTION: Type strict pour les defaults
type DefaultContentKeys = 'description' | 'benefits' | 'usage' | 'testimonials' | 'target';

interface DefaultContent {
  description: string;
  benefits: string;
  usage: string;
  testimonials: string;
  target: string;
}

export class AIResponseHandler {
  private static instance: AIResponseHandler;
  private dynamicContentService = DynamicContentService.getInstance();
  private persuasiveService = PersuasiveAIService.getInstance();

  private constructor() {}

  public static getInstance(): AIResponseHandler {
    if (!this.instance) {
      this.instance = new AIResponseHandler();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE POUR TRAITER LES QUESTIONS LIBRES
  async handleFreeTextMessage(context: AIResponseContext): Promise<ChatMessage> {
    console.log('🤖 Processing free text with enhanced AI:', context.userMessage);

    try {
      // Analyser l'intention de l'utilisateur
      const intent = this.analyzeUserIntent(context.userMessage);
      console.log('🎯 Detected intent:', intent);

      // Traiter selon l'intention détectée
      switch (intent.type) {
        case 'purchase_intent':
          return this.handlePurchaseIntent(context);
        
        case 'product_question':
          return this.handleProductQuestion(context, intent);
        
        case 'price_question':
          return this.handlePriceQuestion(context);
        
        case 'delivery_question':
          return this.handleDeliveryQuestion(context);
        
        case 'testimonials_request':
          return this.handleTestimonialsRequest(context);
        
        case 'support_request':
          return this.handleSupportRequest(context);
        
        case 'greeting':
          return this.handleGreeting(context);
        
        case 'objection':
          return this.handleObjection(context);
        
        default:
          return this.generateContextualResponse(context);
      }

    } catch (error) {
      console.error('❌ Error in handleFreeTextMessage:', error);
      return this.createErrorResponse(context);
    }
  }

  // ✅ GESTION DES BOUTONS POST-ACHAT
  async handlePostPurchaseAction(action: string, orderId?: string): Promise<ChatMessage> {
    const normalizedAction = action.toLowerCase();
    
    if (normalizedAction.includes('suivre') || normalizedAction.includes('commande')) {
      return {
        type: 'assistant',
        content: `📦 **Suivi de votre commande**

${orderId ? `**Commande #${orderId}**` : '**Votre commande**'}

📱 **Comment suivre :**
• Via WhatsApp au +221 78 136 27 28
• Par email avec le numéro de commande
• Vérification du statut en temps réel

📧 **Email de confirmation :**
Vous recevrez un email avec tous les détails dans les 5 minutes.

🚚 **Délai de livraison :**
• Dakar : 24-48h
• Autres zones : 2-3 jours ouvrables

Autre chose pour vous aider ?`,
        choices: [
          '📞 WhatsApp (+221 78 136 27 28)',
          '📧 Problème avec l\'email ?',
          '🛍️ Commander d\'autres jeux',
          '❓ Autre question'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante VOSC'
        },
        metadata: {
          nextStep: 'order_tracking' as ConversationStep,
          externalUrl: {
            type: 'whatsapp',
            url: 'https://wa.me/221781362728',
            description: 'WhatsApp pour suivi'
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    if (normalizedAction.includes('changer') || normalizedAction.includes('adresse')) {
      return {
        type: 'assistant',
        content: `🏠 **Modification d'adresse**

Pour changer votre adresse de livraison :

📞 **Contactez-nous rapidement :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

⏰ **Important :**
• Modification possible avant expédition uniquement
• Délai maximum : 2h après commande
• Frais de livraison peuvent changer selon la nouvelle zone

🚀 **Déjà expédiée ?**
Si votre commande est déjà en route, nous pouvons coordonner avec le livreur.

Voulez-vous nous contacter maintenant ?`,
        choices: [
          '📞 WhatsApp (+221 78 136 27 28)',
          '📧 Envoyer un email',
          '❓ Ma commande est-elle expédiée ?',
          '🔙 Retour au menu'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante VOSC'
        },
        metadata: {
          nextStep: 'address_change_request' as ConversationStep,
          externalUrl: {
            type: 'whatsapp',
            url: 'https://wa.me/221781362728',
            description: 'Contacter pour changement d\'adresse'
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    if (normalizedAction.includes('autre question') || normalizedAction.includes('❓')) {
      return {
        type: 'assistant',
        content: `❓ **Posez-moi votre question !**

Je suis là pour vous aider avec :

🛍️ **Vos commandes :**
• Suivi et statut
• Modifications
• Problèmes de livraison

🎯 **Nos jeux :**
• Comment jouer
• Conseils d'utilisation
• Recommandations personnalisées

💬 **Support :**
• Questions techniques
• Retours et échanges
• Garanties

Tapez votre question dans le champ ci-dessous, je vous réponds immédiatement !`,
        choices: [
          '🎯 Questions sur les jeux',
          '📦 Suivi de commande',
          '🔄 Retours et échanges',
          '📞 Parler à un humain'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante VOSC'
        },
        metadata: {
          nextStep: 'customer_support' as ConversationStep,
          flags: { 
            freeTextEnabled: true,
            supportMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Réponse par défaut
    return {
      type: 'assistant',
      content: `✨ **Comment puis-je vous aider ?**

Je peux vous assister avec :

📦 **Vos commandes :** Suivi, modifications, livraison
🎯 **Nos jeux :** Conseils, règles, recommandations  
💬 **Support :** Questions techniques, garanties

Que souhaitez-vous faire ?`,
      choices: [
        '📦 Suivre ma commande',
        '🛍️ Commander d\'autres jeux',
        '🔄 Retours et échanges',
        '📞 Contacter le support'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'general_support' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES D'ANALYSE D'INTENTION
  private analyzeUserIntent(message: string): UserIntent {
    const normalizedMessage = message.toLowerCase().trim();
    
    const intentions = {
      purchase_intent: ['acheter', 'commander', 'commande', 'achat', 'prendre', 'veux', 'voudrais', 'intéressé'],
      product_question: ['comment', 'fonctionne', 'marche', 'utilise', 'joue', 'règles', 'principe', 'explication'],
      delivery_question: ['livraison', 'livrer', 'expédition', 'envoi', 'délai', 'combien de temps', 'quand', 'où'],
      price_question: ['prix', 'coût', 'coute', 'tarif', 'montant', 'combien'],
      objection: ['cher', 'trop', 'budget', 'pas sûr', 'hésit', 'doute', 'vraiment', 'efficace'],
      greeting: ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'hey', 'coucou'],
      support_request: ['aide', 'aider', 'support', 'problème', 'contact', 'parler', 'humain'],
      testimonials_request: ['avis', 'témoignage', 'opinion', 'retour', 'expérience', 'efficace']
    };

    let bestMatch: UserIntent = { type: 'generic', confidence: 0, keywords: [] };

    for (const [intentType, keywords] of Object.entries(intentions)) {
      const matchedKeywords = keywords.filter(keyword => 
        normalizedMessage.includes(keyword)
      );
      
      const confidence = matchedKeywords.length / keywords.length;
      
      if (matchedKeywords.length > 0 && confidence > bestMatch.confidence) {
        bestMatch = {
          type: intentType,
          confidence,
          keywords: matchedKeywords
        };
      }
    }

    return bestMatch;
  }

  // ✅ GESTIONNAIRES D'INTENTION
  private async handlePurchaseIntent(context: AIResponseContext): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content: `🎉 **Excellente décision !**

Je vais vous aider à commander le **${context.productName}** rapidement.

⚡ **Mode Express :** Commande en moins de 60 secondes
🤖 **Mode Guidé :** Je vous accompagne étape par étape

Quel mode préférez-vous ?`,
      choices: [
        '⚡ Mode Express (< 1 min)',
        '🤖 Mode Guidé avec conseils',
        '💰 Voir les garanties d\'abord'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'mode_selection',
        flags: { 
          purchaseIntent: true,
          highBuyingIntent: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleProductQuestion(context: AIResponseContext, intent: UserIntent): Promise<ChatMessage> {
    const { productId, productName } = context;
    
    if (intent.keywords.includes('comment') || intent.keywords.includes('fonctionne')) {
      const usageInfo = await this.getGameRulesFromDatabase(productId, productName);
      
      return {
        type: 'assistant',
        content: usageInfo,
        choices: [
          '⚡ Je commande maintenant',
          '⭐ Voir les témoignages',
          '💝 Quels bénéfices ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante VOSC'
        },
        metadata: {
          nextStep: 'usage_explained',
          flags: { usageExplained: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Question générale sur le produit
    const descriptionInfo = await this.dynamicContentService.getProductInfo(productId, 'description');
    
    return {
      type: 'assistant',
      content: descriptionInfo,
      choices: [
        '❓ Comment ça marche ?',
        '👥 C\'est pour qui ?',
        '💝 Quels bénéfices ?',
        '⚡ Je commande'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'product_info_detailed'
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handlePriceQuestion(context: AIResponseContext): Promise<ChatMessage> {
    const { productId, productName } = context;
    
    // Récupérer le prix réel
    let price = "15 000";
    try {
      const { data: product } = await supabase
        .from('products')
        .select('price, compare_at_price')
        .eq('id', productId)
        .single();
        
      if (product) {
        price = product.price.toLocaleString();
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    }
    
    return {
      type: 'assistant',
      content: `💰 **Prix du ${productName} :**

🎯 **${price} FCFA** - Voici ce qui est inclus :

✨ **Contenu :**
• 100+ cartes de qualité premium
• Guide d'utilisation complet
• Boîte de rangement élégante
• Livraison incluse selon votre zone

💡 **Comparaison :**
• Restaurant familial = 15 000 FCFA (une soirée)
• Notre jeu = 15 000 FCFA (**des années** d'utilisation)

🏆 **Garantie :** 30 jours satisfait ou remboursé

Voulez-vous le commander maintenant ?`,
      choices: [
        '⚡ Oui, je commande',
        '💝 Quels bénéfices exactement ?',
        '⭐ Témoignages clients',
        '💰 Détails de la garantie'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'price_explained',
        flags: { priceExplained: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleDeliveryQuestion(context: AIResponseContext): Promise<ChatMessage> {
    const deliveryInfo = await this.dynamicContentService.getDeliveryInfo();
    
    let deliveryContent = `🚚 **Informations de livraison**\n\n`;
    
    if (deliveryInfo && deliveryInfo.zones.length > 0) {
      deliveryContent += `📍 **Zones couvertes :**\n`;
      deliveryInfo.zones.forEach(zone => {
        if (zone.active) {
          const cityName = zone.city || zone.name;
          deliveryContent += `• ${cityName} : ${zone.cost.toLocaleString()} FCFA\n`;
        }
      });
      
      deliveryContent += `\n⏰ **Délais :**\n• ${deliveryInfo.timing}\n\n`;
      deliveryContent += `💰 **Paiement :**\n• Wave\n• Carte bancaire\n• Paiement à la livraison\n\n`;
    } else {
      deliveryContent += `📍 **Zones principales :**\n• Dakar : Gratuit\n• Autres villes Sénégal : 3 000 FCFA\n• Abidjan : 2 500 FCFA\n\n⏰ **Délais :**\n• Livraison sous 24-48h\n\n💰 **Paiement :**\n• Wave\n• Carte bancaire\n• Paiement à la livraison\n\n`;
    }
    
    deliveryContent += `Voulez-vous commander maintenant ?`;

    return {
      type: 'assistant',
      content: deliveryContent,
      choices: [
        '⚡ Commander maintenant',
        '📞 Autres questions',
        '🏠 Ma zone de livraison'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'delivery_info_shown'
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleTestimonialsRequest(context: AIResponseContext): Promise<ChatMessage> {
    const testimonialsInfo = await this.dynamicContentService.getProductInfo(context.productId, 'testimonials');
    
    return {
      type: 'assistant',
      content: testimonialsInfo,
      choices: [
        '⚡ Je veux commander maintenant',
        '❓ Comment ça marche ?',
        '💝 Quels bénéfices ?',
        '📞 Parler à un client'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'testimonials_shown',
        flags: { socialProofShown: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleSupportRequest(context: AIResponseContext): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content: `🤝 **Je suis là pour vous aider !**

Vous pouvez :
• **Me poser vos questions** ici directement
• **Parler à un conseiller humain** sur WhatsApp

📞 **Contact direct :**
WhatsApp : +221 78 136 27 28
Email : contact@viensonseconnait.com

⏰ **Disponibilité :**
• Lundi à Vendredi : 9h - 18h
• Samedi : 9h - 14h
• Dimanche : Fermé

De quoi avez-vous besoin exactement ?`,
      choices: [
        '📞 WhatsApp (+221 78 136 27 28)',
        '❓ Poser ma question ici',
        '📧 Envoyer un email',
        '⚡ Finalement, je veux commander'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'support_request',
        externalUrl: {
          type: 'whatsapp',
          url: 'https://wa.me/221781362728',
          description: 'Contacter sur WhatsApp'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleGreeting(context: AIResponseContext): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content: `👋 **Bonjour et bienvenue !**

Je suis **Rose**, votre conseillère pour le **${context.productName}** !

🔥 **Ce jeu est très populaire** - plus de 200 familles l'ont commandé ce mois-ci !

✨ **Je peux vous aider à :**
• Découvrir comment il fonctionne
• Comprendre pourquoi il transforme les relations
• Commander rapidement si ça vous intéresse
• Répondre à toutes vos questions

Par quoi commençons-nous ?`,
      choices: [
        '🔥 Pourquoi est-ce si populaire ?',
        '💝 Quels bénéfices pour moi ?',
        '⭐ Témoignages clients',
        '⚡ Commander rapidement'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'warm_welcome',
        flags: { isGreeting: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleObjection(context: AIResponseContext): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content: `🤔 **Je comprends vos interrogations !**

Beaucoup de nos clients ont eu les **mêmes questionnements** avant d'essayer le **${context.productName}**.

🎯 **Ce qui les a rassurés :**
• **Garantie satisfait ou remboursé** 30 jours
• **Résultats visibles** dès la première utilisation  
• **1200+ familles satisfaites** dans 12 pays
• **Support client** disponible 7j/7

✨ **Aucun risque :** Si le jeu ne transforme pas vos relations, remboursement **immédiat**.

Quelle est votre principale préoccupation ?`,
      choices: [
        '💰 Le prix me semble élevé',
        '🤔 Est-ce que ça marche vraiment ?',
        '⭐ Voir les témoignages',
        '✅ Je teste sans risque'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'objection_handling',
        flags: { objectionRaised: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ RÉCUPÉRATION SÉCURISÉE DES RÈGLES DU JEU
  private async getGameRulesFromDatabase(productId: string, productName: string): Promise<string> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('game_rules, name')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return this.getDefaultGameRules(productName);
      }

      if (product.game_rules && product.game_rules.trim()) {
        return `❓ **Comment jouer au ${product.name} :**

${product.game_rules}

Prêt(e) à vivre cette expérience ?`;
      } else {
        return this.getDefaultGameRules(productName);
      }

    } catch (error) {
      console.error('❌ Error getting game rules:', error);
      return this.getDefaultGameRules(productName);
    }
  }

  private getDefaultGameRules(productName: string): string {
    return `❓ **Comment jouer au ${productName} :**

📋 **Préparation :**
• Installez-vous confortablement dans un endroit calme
• Mélangez les cartes et placez-les au centre
• Chacun tire une carte à tour de rôle

🎮 **Déroulement :**
• Lisez la question ou consigne à voix haute
• Prenez le temps de réfléchir avant de répondre
• Écoutez attentivement les réponses des autres
• Pas de jugement, seulement de la bienveillance

⏰ **Durée recommandée :**
• 30 à 60 minutes par session
• Possibilité de jouer plusieurs fois
• Adaptez selon vos envies

Prêt(e) à commencer cette belle aventure ?`;
  }

  // ✅ RÉPONSE CONTEXTUELLE GÉNÉRIQUE
  private async generateContextualResponse(context: AIResponseContext): Promise<ChatMessage> {
    const { userMessage, productName, conversationHistory } = context;
    const messageCount = conversationHistory.length;

    const isQuestion = userMessage.includes('?') || 
                      userMessage.toLowerCase().startsWith('comment') ||
                      userMessage.toLowerCase().startsWith('pourquoi');

    let response = '';
    let choices: string[] = [];
    let nextStep: ConversationStep = 'generic_response';

    if (isQuestion) {
      response = `🤔 **Excellente question !** 

Je vois que vous vous intéressez au jeu **${productName}**. C'est un choix parfait !

✨ **Je peux vous expliquer :**
• Comment utiliser le jeu concrètement
• Les bénéfices que vous allez obtenir  
• Les témoignages de nos clients satisfaits
• Les détails pratiques (livraison, garantie)

Qu'est-ce qui vous intéresse le plus ?`;

      choices = [
        '⚡ Je commande maintenant',
        '📖 Comment ça marche ?',
        '⭐ Témoignages clients',
        '💰 Infos sur la garantie'
      ];
      nextStep = 'question_answered';

    } else if (messageCount > 3) {
      response = `💬 **Je vois qu'on échange depuis un moment !**

Cela me fait plaisir de répondre à vos questions sur le **${productName}**.

🤗 Voulez-vous que je vous aide à finaliser votre commande ou avez-vous encore des questions ?`;

      choices = [
        '⚡ Oui, aidez-moi à commander',
        '❓ J\'ai encore des questions',
        '⭐ Voir les témoignages',
        '💰 Détails sur la garantie'
      ];
      nextStep = 'conversion_focus';
    } else {
      response = `💬 **Merci pour votre message !**

Je vois que vous vous intéressez au **${productName}**. C'est un excellent choix !

Que puis-je vous expliquer pour vous aider dans votre décision ?`;

      choices = [
        '❓ Comment ça fonctionne ?',
        '💝 Quels bénéfices ?',
        '⭐ Avis clients',
        '⚡ Commander maintenant'
      ];
      nextStep = 'information_gathering';
    }

    return {
      type: 'assistant',
      content: response,
      choices,
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep,
        flags: { contextualResponse: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ GESTION D'ERREUR AMÉLIORÉE
  private createErrorResponse(context: AIResponseContext): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **Désolée, j'ai rencontré un petit problème.**

Mais ne vous inquiétez pas ! Je peux toujours vous aider avec :

• Des informations sur le **${context.productName}**
• Répondre à vos questions
• Vous accompagner dans votre commande
• Vous mettre en contact avec notre équipe

Que puis-je faire pour vous ?`,
      choices: [
        '🔄 Réessayer',
        '❓ Poser une question',
        '📞 Contacter le support',
        '⚡ Commander quand même'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante VOSC'
      },
      metadata: {
        nextStep: 'error_recovery',
        flags: { hasError: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODE COMPATIBLE AVEC L'ANCIEN SYSTÈME
  async getProductInfoFromDatabase(productId: string, infoType: DefaultContentKeys): Promise<string> {
    try {
      return await this.dynamicContentService.getProductInfo(productId, infoType);
    } catch (error) {
      console.error('Error fetching product info:', error);
      return this.getDefaultProductInfo(infoType);
    }
  }

  // ✅ CORRECTION TYPESCRIPT : Fonction avec type strict
  private getDefaultProductInfo(infoType: DefaultContentKeys): string {
    const defaults: DefaultContent = {
      description: '💬 **En savoir plus sur notre jeu de cartes**\n\nCe jeu a été spécialement conçu pour renforcer les liens et améliorer la communication.',
      benefits: '💝 **Bénéfices de notre jeu :**\n\n✨ Communication améliorée\n🤝 Relations renforcées\n🌟 Moments privilégiés',
      usage: '❓ **Comment utiliser le jeu :**\n\n📋 Installez-vous confortablement\n🎮 Chacun tire une carte à tour de rôle\n⏰ 30 à 60 minutes par session',
      testimonials: '⭐ **Ce que disent nos clients :**\n\n⭐⭐⭐⭐⭐ **Marie & Jean**\n"Ce jeu a révolutionné notre communication."',
      target: '👥 **Ce jeu est parfait pour :**\n\n• Toute personne souhaitant améliorer ses relations\n• Ceux qui cherchent à créer des moments authentiques'
    };

    return defaults[infoType];
  }

  // ✅ MÉTHODES UTILITAIRES POUR VALIDATION
  validateResponseStructure(response: ChatMessage): boolean {
    return !!(
      response.type &&
      response.content &&
      response.assistant &&
      response.timestamp &&
      response.metadata
    );
  }

  // ✅ MÉTHODE POUR LOGGING
  logInteraction(context: AIResponseContext, response: ChatMessage): void {
    console.log('🔍 AI Interaction Log:', {
      timestamp: new Date().toISOString(),
      productId: context.productId,
      userMessage: context.userMessage.substring(0, 100) + '...',
      responseType: response.type,
      nextStep: response.metadata?.nextStep,
      conversationLength: context.conversationHistory.length
    });
  }
}

export default AIResponseHandler;