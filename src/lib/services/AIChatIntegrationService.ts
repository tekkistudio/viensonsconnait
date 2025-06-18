// src/lib/services/AIChatIntegrationService.ts - VERSION COMPLÈTE

import { supabase } from '@/lib/supabase';
import { VoscAIAgent } from './VoscAIAgent';
import { ConversationalCartService } from './ConversationalCartService';
import type { 
  ChatMessage, 
  ConversationStep,
  CustomerData,
  ProductData,
  AIContext
} from '@/types/chat';

interface ChatSession {
  sessionId: string;
  productId?: string;
  customerId?: string;
  conversationHistory: ChatMessage[];
  currentStep: ConversationStep;
  metadata: Record<string, any>;
  createdAt: string;
  lastActivity: string;
}

export class AIChatIntegrationService {
  private static instance: AIChatIntegrationService;
  private voscAgent: VoscAIAgent;
  private cartService: ConversationalCartService;
  private activeSessions: Map<string, ChatSession> = new Map();

  private constructor() {
    this.voscAgent = VoscAIAgent.getInstance();
    this.cartService = ConversationalCartService.getInstance();
  }

  public static getInstance(): AIChatIntegrationService {
    if (!this.instance) {
      this.instance = new AIChatIntegrationService();
    }
    return this.instance;
  }

  /**
   * 🚀 MÉTHODE PRINCIPALE: Initialiser une nouvelle conversation
   */
  async initializeConversation(
    sessionId: string,
    productId?: string,
    initialContext?: Record<string, any>
  ): Promise<ChatMessage> {
    try {
      console.log('🎬 Initialisation conversation IA:', { sessionId, productId });

      // Créer ou récupérer la session
      let session = await this.getOrCreateSession(sessionId, productId, initialContext);

      // Si c'est une nouvelle session, envoyer le message d'accueil
      if (session.conversationHistory.length === 0) {
        const welcomeMessage = await this.generateWelcomeMessage(session);
        
        // Ajouter le message à l'historique
        session.conversationHistory.push(welcomeMessage);
        session.lastActivity = new Date().toISOString();
        
        // Sauvegarder la session
        await this.saveSession(session);
        
        return welcomeMessage;
      }

      // Retourner le dernier message de l'assistant
      const lastAssistantMessage = [...session.conversationHistory]
        .reverse()
        .find(msg => msg.type === 'assistant');

      return lastAssistantMessage || await this.generateWelcomeMessage(session);

    } catch (error) {
      console.error('❌ Erreur initialisation conversation:', error);
      return this.createErrorMessage(sessionId);
    }
  }

  /**
   * 💬 MÉTHODE PRINCIPALE: Traiter un message utilisateur
   */
  async processUserMessage(
    sessionId: string,
    userMessage: string,
    productId?: string
  ): Promise<ChatMessage> {
    try {
      console.log('💬 Traitement message utilisateur:', { sessionId, userMessage, productId });

      // Récupérer la session
      const session = await this.getOrCreateSession(sessionId, productId);

      // Ajouter le message utilisateur à l'historique
      const userChatMessage: ChatMessage = {
        type: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      
      session.conversationHistory.push(userChatMessage);

      // Préparer le contexte pour l'Agent IA
      const aiContext: AIContext = {
        sessionId: session.sessionId,
        productId: session.productId,
        conversationHistory: session.conversationHistory,
        currentStep: session.currentStep,
        metadata: session.metadata,
        customerData: await this.extractCustomerData(session)
      };

      // Traiter avec l'Agent IA
      const aiResponse = await this.voscAgent.processUserMessage(userMessage, aiContext);

      // Ajouter la réponse à l'historique
      session.conversationHistory.push(aiResponse);
      
      // Mettre à jour l'étape de conversation si spécifiée
      if (aiResponse.metadata?.nextStep) {
        session.currentStep = aiResponse.metadata.nextStep;
      }

      // Traiter les actions spéciales si présentes
      if (aiResponse.metadata?.actions) {
        await this.handleSpecialActions(aiResponse.metadata.actions, session, aiResponse);
      }

      // Mettre à jour la session
      session.lastActivity = new Date().toISOString();
      await this.saveSession(session);

      return aiResponse;

    } catch (error) {
      console.error('❌ Erreur traitement message:', error);
      return this.createErrorMessage(sessionId);
    }
  }

  /**
   * 🔄 MÉTHODE: Traiter les choix par boutons
   */
  async processButtonChoice(
    sessionId: string,
    choice: string,
    productId?: string
  ): Promise<ChatMessage> {
    try {
      console.log('🔘 Traitement choix bouton:', { sessionId, choice });

      // Récupérer la session
      const session = await this.getOrCreateSession(sessionId, productId);

      // Analyser le type de choix
      const choiceType = this.analyzeButtonChoice(choice);
      
      let responseMessage: string;
      let followUpMessage: ChatMessage;

      switch (choiceType.type) {
        case 'purchase_intent':
          responseMessage = `✅ Parfait ! Vous avez choisi "${choice}"`;
          followUpMessage = await this.handlePurchaseFlow(session, choiceType.subType);
          break;

        case 'product_inquiry':
          responseMessage = `❓ Vous voulez en savoir plus : "${choice}"`;
          followUpMessage = await this.handleProductInquiry(session, choiceType.subType);
          break;

        case 'navigation':
          responseMessage = `🧭 Navigation : "${choice}"`;
          followUpMessage = await this.handleNavigation(session, choiceType.subType);
          break;

        default:
          // Traiter comme un message normal
          return await this.processUserMessage(sessionId, choice, productId);
      }

      // Ajouter les messages à l'historique
      const userChoice: ChatMessage = {
        type: 'user',
        content: responseMessage,
        timestamp: new Date().toISOString()
      };

      session.conversationHistory.push(userChoice, followUpMessage);
      session.lastActivity = new Date().toISOString();
      
      await this.saveSession(session);

      return followUpMessage;

    } catch (error) {
      console.error('❌ Erreur traitement choix:', error);
      return this.createErrorMessage(sessionId);
    }
  }

  /**
   * 📱 MÉTHODE: Générer message d'accueil personnalisé
   */
  private async generateWelcomeMessage(session: ChatSession): Promise<ChatMessage> {
    try {
      // Récupérer les informations du produit si disponible
      let product: ProductData | null = null;
      
      if (session.productId) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', session.productId)
          .single();
        
        if (!error && data) {
          product = data;
        }
      }

      // Récupérer des statistiques pour la preuve sociale
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'confirmed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const recentSalesCount = recentOrders?.length || 0;

      // Message d'accueil adapté
      let welcomeMessage = '';
      let choices: string[] = [];

      if (product) {
        // Accueil spécifique au produit
        welcomeMessage = `🌟 **Bonjour ! Je suis Rose, votre conseillère VIENS ON S'CONNAÎT.**

Je vois que **${product.name}** vous intéresse ! 

${product.description || 'Ce jeu est parfait pour renforcer vos relations et créer des moments magiques.'}

💰 **Prix:** ${product.price.toLocaleString()} FCFA`;

        if (recentSalesCount > 0) {
          welcomeMessage += `\n✨ **${recentSalesCount} personnes l'ont commandé cette semaine !**`;
        }

        welcomeMessage += `\n\nComment puis-je vous aider aujourd'hui ?`;

        choices = [
          '⚡ Je veux l\'acheter maintenant',
          '❓ J\'ai des questions',
          '🎮 Comment ça marche ?',
          '⭐ Avis clients'
        ];

        session.currentStep = 'product_engagement';

      } else {
        // Accueil général de la marque
        welcomeMessage = `🌟 **Bonjour ! Je suis Rose, votre conseillère VIENS ON S'CONNAÎT.**

Bienvenue dans l'univers des jeux de cartes relationnels qui transforment vos relations ! 🎮❤️

🇸🇳 **Conçus au Sénégal** pour les familles africaines
✨ **Plus de 1 000 familles satisfaites**
🚚 **Livraison dans 12 pays africains**`;

        if (recentSalesCount > 0) {
          welcomeMessage += `\n🔥 **${recentSalesCount} commandes cette semaine !**`;
        }

        welcomeMessage += `\n\nQue puis-je faire pour vous ?`;

        choices = [
          '🎮 Découvrir vos jeux',
          '🛒 Passer une commande',
          '📱 Votre application mobile',
          '❓ Poser une question'
        ];

        session.currentStep = 'initial_engagement';
      }

      return {
        type: 'assistant',
        content: welcomeMessage,
        choices,
        assistant: {
          name: 'Rose',
          title: 'Conseillère VIENS ON S\'CONNAÎT'
        },
        metadata: {
          nextStep: session.currentStep,
          sessionId: session.sessionId,
          productId: session.productId,
          welcomeMessage: true
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erreur génération message d\'accueil:', error);
      return this.createErrorMessage(session.sessionId);
    }
  }

  /**
   * 🛒 MÉTHODE: Gérer le flux d'achat
   */
  private async handlePurchaseFlow(
    session: ChatSession, 
    subType?: string
  ): Promise<ChatMessage> {
    try {
      const product = await this.getProductFromSession(session);
      
      if (!product) {
        return {
          type: 'assistant',
          content: `🤗 **Je vais vous aider à choisir le jeu parfait !**

Quel type de relations souhaitez-vous renforcer ?`,
          choices: [
            '❤️ Couple',
            '👨‍👩‍👧‍👦 Famille',
            '👫 Amis',
            '💼 Collègues'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: { nextStep: 'product_selection' as ConversationStep },
          timestamp: new Date().toISOString()
        };
      }

      // Flux d'achat express ou guidé
      if (subType === 'express') {
        return {
          type: 'assistant',
          content: `⚡ **Commande Express - ${product.name}**

💰 **Prix:** ${product.price.toLocaleString()} FCFA
🚚 **Livraison:** Rapide et sécurisée

**Étapes express (moins d'1 minute) :**
1️⃣ Quantité souhaitée
2️⃣ Vos coordonnées
3️⃣ Adresse de livraison
4️⃣ Mode de paiement

Quelle quantité voulez-vous ?`,
          choices: ['1 jeu', '2 jeux', '3 jeux', 'Autre quantité'],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: { 
            nextStep: 'express_quantity' as ConversationStep,
            flow: 'express',
            productId: product.id
          },
          timestamp: new Date().toISOString()
        };
      }

      // Flux d'achat standard
      return {
        type: 'assistant',
        content: `🛒 **Excellente décision ! ${product.name}**

Laissez-moi vous accompagner pas à pas pour finaliser votre commande.

Avant de commencer, avez-vous des questions sur :`,
        choices: [
          '🎮 Comment jouer ?',
          '🚚 La livraison',
          '💳 Le paiement',
          '⚡ Non, commander directement'
        ],
        assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
        metadata: { 
          nextStep: 'pre_purchase_questions' as ConversationStep,
          productId: product.id
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erreur flux d\'achat:', error);
      return this.createErrorMessage(session.sessionId);
    }
  }

  /**
   * ❓ MÉTHODE: Gérer les questions sur le produit
   */
  private async handleProductInquiry(
    session: ChatSession, 
    subType?: string
  ): Promise<ChatMessage> {
    try {
      const product = await this.getProductFromSession(session);
      
      if (!product) {
        return {
          type: 'assistant',
          content: `❓ **Je suis là pour répondre à toutes vos questions !**

Sur quoi souhaitez-vous être renseigné(e) ?`,
          choices: [
            '🎮 Nos jeux disponibles',
            '🚚 Livraison et délais',
            '💳 Modes de paiement',
            '📱 Application mobile'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: { nextStep: 'general_inquiry' as ConversationStep },
          timestamp: new Date().toISOString()
        };
      }

      switch (subType) {
        case 'rules':
          const rules = product.game_rules || 'Les règles détaillées sont fournies avec le jeu.';
          return {
            type: 'assistant',
            content: `🎮 **Comment jouer à ${product.name} :**

${rules}

🕒 **Durée:** Adaptable (15 min à 2h)
👥 **Joueurs:** Minimum 2 personnes
🎯 **But:** Créer des conversations authentiques

Prêt(e) à vivre cette expérience ?`,
            choices: [
              '✅ Oui, je veux l\'acheter !',
              '💝 Quels sont les bénéfices ?',
              '⭐ Voir des témoignages'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { nextStep: 'post_rules_engagement' as ConversationStep },
            timestamp: new Date().toISOString()
          };

        case 'benefits':
          return {
            type: 'assistant',
            content: `💝 **Les bénéfices de ${product.name} :**

🤝 **Relations renforcées** - Conversations profondes qui rapprochent
💬 **Communication améliorée** - Apprendre à vraiment s'écouter  
❤️ **Moments privilégiés** - Temps de qualité sans distractions
🌟 **Souvenirs durables** - Histoires à partager en famille
✨ **Bien-être** - Réduction du stress, plus de complicité

Plus de 1 000 familles africaines témoignent de ces transformations !

Lequel de ces bénéfices vous motive le plus ?`,
            choices: [
              '🤝 Des relations plus fortes',
              '💬 Mieux communiquer',
              '🛒 Je suis convaincu(e) !'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { nextStep: 'benefits_engagement' as ConversationStep },
            timestamp: new Date().toISOString()
          };

        default:
          return {
            type: 'assistant',
            content: `📋 **À propos de ${product.name} :**

${product.description || 'Un jeu conçu pour transformer vos relations.'}

**Ce qui le rend unique :**
✨ Développé par des psychologues au Sénégal
🇸🇳 Adapté à la culture africaine
✅ Testé par 1 000+ familles
🎯 Questions pensées pour notre contexte

Que voulez-vous savoir de plus ?`,
            choices: [
              '🎮 Comment y jouer ?',
              '💝 Quels bénéfices ?',
              '⭐ Témoignages clients',
              '🛒 Je veux l\'acheter'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { nextStep: 'product_details' as ConversationStep },
            timestamp: new Date().toISOString()
          };
      }

    } catch (error) {
      console.error('❌ Erreur inquiry produit:', error);
      return this.createErrorMessage(session.sessionId);
    }
  }

  /**
   * 🧭 MÉTHODE: Gérer la navigation
   */
  private async handleNavigation(
    session: ChatSession, 
    subType?: string
  ): Promise<ChatMessage> {
    try {
      switch (subType) {
        case 'all_products':
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (!products || products.length === 0) {
            return {
              type: 'assistant',
              content: `😔 **Aucun produit disponible pour le moment.**

Nous travaillons sur de nouveaux jeux passionnants ! 

📞 **Contactez-nous pour être informé(e) :**
WhatsApp : +221 78 136 27 28`,
              choices: ['📞 Contacter sur WhatsApp', '🏠 Retour accueil'],
              assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
              metadata: { nextStep: 'no_products' as ConversationStep },
              timestamp: new Date().toISOString()
            };
          }

          const productList = products.map(p => 
            `🎮 **${p.name}**\n💰 ${p.price.toLocaleString()} FCFA\n📝 ${(p.description || '').substring(0, 80)}...`
          ).join('\n\n');

          return {
            type: 'assistant',
            content: `🎮 **Nos jeux disponibles :**

${productList}

Lequel vous intéresse le plus ?`,
            choices: [
              ...products.slice(0, 3).map(p => p.name),
              '📞 Conseil personnalisé'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { 
              nextStep: 'product_selection' as ConversationStep,
              availableProducts: products
            },
            timestamp: new Date().toISOString()
          };

        case 'mobile_app':
          return {
            type: 'assistant',
            content: `📱 **Application VIENS ON S'CONNAÎT**

🎮 **Tous vos jeux dans votre poche !**

✨ **Fonctionnalités :**
• 🃏 Accès à vos jeux achetés
• 🎲 Mode hors ligne
• 👥 Partage avec la famille
• 📊 Suivi de vos parties
• 🆕 Nouveaux contenus

📲 **Téléchargement gratuit :**
• App Store (iOS)
• Google Play Store (Android)

🎁 **Bonus :** 50 questions offertes !

Souhaitez-vous télécharger l'app ?`,
            choices: [
              '📲 Télécharger maintenant',
              '🎮 D\'abord un jeu physique',
              '❓ Comment ça fonctionne ?'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { 
              nextStep: 'mobile_app_interest' as ConversationStep,
              externalLinks: {
                appStore: 'https://apps.apple.com/viensonseconnait',
                playStore: 'https://play.google.com/store/apps/viensonseconnait'
              }
            },
            timestamp: new Date().toISOString()
          };

        case 'whatsapp':
          return {
            type: 'assistant',
            content: `📞 **Contact WhatsApp**

Je vais vous rediriger vers notre équipe WhatsApp pour un accompagnement personnalisé.

**Notre équipe est disponible :**
🕐 Lundi - Vendredi : 8h - 18h
🕐 Samedi : 9h - 15h
📱 +221 78 136 27 28

Voulez-vous être redirigé(e) maintenant ?`,
            choices: [
              '📱 Oui, rediriger vers WhatsApp',
              '💬 Continuer ici',
              '📧 Préférer l\'email'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { 
              nextStep: 'whatsapp_redirect' as ConversationStep,
              whatsappUrl: 'https://wa.me/221781362728'
            },
            timestamp: new Date().toISOString()
          };

        default:
          return {
            type: 'assistant',
            content: `🧭 **Menu principal**

Comment puis-je vous aider ?`,
            choices: [
              '🎮 Voir tous les jeux',
              '🛒 Passer une commande',
              '📱 Application mobile',
              '📞 Nous contacter'
            ],
            assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
            metadata: { nextStep: 'main_menu' as ConversationStep },
            timestamp: new Date().toISOString()
          };
      }

    } catch (error) {
      console.error('❌ Erreur navigation:', error);
      return this.createErrorMessage(session.sessionId);
    }
  }

  /**
   * ⚙️ MÉTHODE: Traiter les actions spéciales
   */
  private async handleSpecialActions(
    actions: string[], 
    session: ChatSession, 
    message: ChatMessage
  ): Promise<void> {
    try {
      for (const action of actions) {
        switch (action) {
          case 'start_express_order':
            // Initialiser le panier conversationnel
            await this.cartService.getOrCreateCart(session.sessionId, session.productId);
            break;

          case 'show_products':
            // Marquer l'intérêt pour les produits
            session.metadata.showedProducts = true;
            break;

          case 'track_app_interest':
            // Tracker l'intérêt pour l'application
            session.metadata.appInterest = true;
            break;

          case 'prepare_support_transfer':
            // Préparer le transfert vers le support
            session.metadata.supportTransfer = {
              timestamp: new Date().toISOString(),
              reason: 'user_request'
            };
            break;

          case 'prepare_order_options':
            // Préparer les options de commande
            session.metadata.orderPreparation = true;
            break;

          default:
            console.log('⚠️ Action non reconnue:', action);
        }
      }

    } catch (error) {
      console.error('❌ Erreur actions spéciales:', error);
    }
  }

  /**
   * 🔍 MÉTHODES UTILITAIRES
   */

  private async getOrCreateSession(
    sessionId: string, 
    productId?: string, 
    initialContext?: Record<string, any>
  ): Promise<ChatSession> {
    
    // Vérifier le cache en mémoire
    let session: ChatSession | undefined = this.activeSessions.get(sessionId);
    
    if (!session) {
      // Essayer de charger depuis la base de données
      const loadedSession = await this.loadSessionFromDatabase(sessionId);
        if (loadedSession) {
        session = loadedSession;
        }
      
      if (!session) {
        // Créer une nouvelle session
        session = {
          sessionId,
          productId,
          conversationHistory: [],
          currentStep: 'initial_engagement',
          metadata: {
            createdAt: new Date().toISOString(),
            ...initialContext
          },
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
      }
      
      this.activeSessions.set(sessionId, session);
    }

    // Mettre à jour le productId si fourni et différent
    if (productId && session.productId !== productId) {
      session.productId = productId;
      session.metadata.productChanged = true;
    }

    return session;
  }

  private async loadSessionFromDatabase(sessionId: string): Promise<ChatSession | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error || !conversation) {
        return null;
      }

      // Charger les messages de la conversation
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Erreur chargement messages:', messagesError);
        return null;
      }

      // Reconstituer la session
      const session: ChatSession = {
        sessionId: conversation.session_id,
        productId: conversation.product_id,
        customerId: conversation.customer_id,
        conversationHistory: messages?.map(msg => ({
          type: msg.type as 'user' | 'assistant',
          content: msg.content,
          choices: msg.choices,
          assistant: msg.assistant_info,
          metadata: msg.metadata,
          timestamp: msg.created_at
        })) || [],
        currentStep: conversation.current_step as ConversationStep,
        metadata: conversation.metadata || {},
        createdAt: conversation.created_at,
        lastActivity: conversation.last_activity
      };

      return session;

    } catch (error) {
      console.error('❌ Erreur chargement session:', error);
      return null;
    }
  }

  private async saveSession(session: ChatSession): Promise<void> {
    try {
      // Sauvegarder la conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .upsert({
          session_id: session.sessionId,
          product_id: session.productId,
          customer_id: session.customerId,
          current_step: session.currentStep,
          metadata: session.metadata,
          last_activity: session.lastActivity,
          created_at: session.createdAt
        }, {
          onConflict: 'session_id'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Erreur sauvegarde conversation:', conversationError);
        return;
      }

      // Sauvegarder les nouveaux messages
      const existingMessageCount = await this.getExistingMessageCount(conversation.id);
      const newMessages = session.conversationHistory.slice(existingMessageCount);

      if (newMessages.length > 0) {
        const messagesToInsert = newMessages.map(msg => ({
          conversation_id: conversation.id,
          type: msg.type,
          content: msg.content,
          choices: msg.choices,
          assistant_info: msg.assistant,
          metadata: msg.metadata,
          created_at: msg.timestamp
        }));

        const { error: messagesError } = await supabase
          .from('chat_messages')
          .insert(messagesToInsert);

        if (messagesError) {
          console.error('❌ Erreur sauvegarde messages:', messagesError);
        }
      }

      // Mettre à jour le cache
      this.activeSessions.set(session.sessionId, session);

    } catch (error) {
      console.error('❌ Erreur sauvegarde session:', error);
    }
  }

  private async getExistingMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('❌ Erreur comptage messages:', error);
      return 0;
    }

    return count || 0;
  }

  private async getProductFromSession(session: ChatSession): Promise<ProductData | null> {
    if (!session.productId) return null;

    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', session.productId)
        .single();

      return error ? null : product;
    } catch (error) {
      return null;
    }
  }

  private async extractCustomerData(session: ChatSession): Promise<Partial<CustomerData> | undefined> {
    // Extraire les données client des métadonnées ou de l'historique
    const customerData: Partial<CustomerData> = {};

    // Rechercher dans les métadonnées
    if (session.metadata.customerPhone) {
      customerData.phone = session.metadata.customerPhone;
    }
    
    if (session.metadata.customerName) {
      customerData.first_name = session.metadata.customerName;
    }

    // Rechercher un client existant si on a le téléphone
    if (customerData.phone) {
      try {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customerData.phone)
          .single();

        if (existingCustomer) {
          return existingCustomer;
        }
      } catch (error) {
        // Client non trouvé, continuer avec les données partielles
      }
    }

    return Object.keys(customerData).length > 0 ? customerData : undefined;
  }

  private analyzeButtonChoice(choice: string): { type: string; subType?: string } {
    const lowerChoice = choice.toLowerCase();

    // Intentions d'achat
    if (lowerChoice.includes('acheter') || lowerChoice.includes('commander') || 
        lowerChoice.includes('maintenant') || lowerChoice.includes('express')) {
      const subType = lowerChoice.includes('express') ? 'express' : 'standard';
      return { type: 'purchase_intent', subType };
    }

    // Questions sur le produit
    if (lowerChoice.includes('comment') || lowerChoice.includes('règle') || 
        lowerChoice.includes('jouer') || lowerChoice.includes('fonctionne')) {
      return { type: 'product_inquiry', subType: 'rules' };
    }

    if (lowerChoice.includes('bénéfice') || lowerChoice.includes('avantage')) {
      return { type: 'product_inquiry', subType: 'benefits' };
    }

    // Navigation
    if (lowerChoice.includes('jeux') || lowerChoice.includes('produit')) {
      return { type: 'navigation', subType: 'all_products' };
    }

    if (lowerChoice.includes('app') || lowerChoice.includes('mobile')) {
      return { type: 'navigation', subType: 'mobile_app' };
    }

    if (lowerChoice.includes('whatsapp') || lowerChoice.includes('contact')) {
      return { type: 'navigation', subType: 'whatsapp' };
    }

    return { type: 'general' };
  }

  private createErrorMessage(sessionId: string): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **Désolée, une erreur technique est survenue.**

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
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        sessionId,
        error: 'true'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🧹 MÉTHODE: Nettoyer les sessions inactives
   */
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactivityThreshold = 24 * 60 * 60 * 1000; // 24 heures

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const lastActivity = new Date(session.lastActivity);
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

      if (timeSinceLastActivity > inactivityThreshold) {
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Session nettoyée: ${sessionId}`);
      }
    }
  }

  /**
   * 📊 MÉTHODE: Obtenir les statistiques des conversations
   */
  async getConversationStats(): Promise<{
    activeSessions: number;
    totalConversations: number;
    averageMessagesPerConversation: number;
    conversionRate: number;
  }> {
    try {
      const activeSessions = this.activeSessions.size;

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalConversations = conversations?.length || 0;

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('conversation_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const averageMessagesPerConversation = totalConversations > 0 ? 
        (messages?.length || 0) / totalConversations : 0;

      const { data: orders } = await supabase
        .from('orders')
        .select('id, metadata')
        .eq('status', 'confirmed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const chatOrders = orders?.filter(order => 
        order.metadata?.source === 'chat' || order.metadata?.source === 'chatbot'
      ).length || 0;

      const conversionRate = totalConversations > 0 ? 
        (chatOrders / totalConversations) * 100 : 0;

      return {
        activeSessions,
        totalConversations,
        averageMessagesPerConversation: Math.round(averageMessagesPerConversation * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10
      };

    } catch (error) {
      console.error('❌ Erreur statistiques conversations:', error);
      return {
        activeSessions: 0,
        totalConversations: 0,
        averageMessagesPerConversation: 0,
        conversionRate: 0
      };
    }
  }
}