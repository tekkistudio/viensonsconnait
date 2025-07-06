// src/lib/services/AIManager.ts - VERSION CORRIGÉE AVEC GPT-4o PLEINEMENT FONCTIONNEL
import { ErrorManager } from './ErrorManager';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import type { 
  CustomerMessage,
  ChatMessage,
  ConversationStep,
  AIResponse,
  OrderData,
  MessageType,
  ProductData
} from '@/types/chat';

const isServer = typeof window === 'undefined';
let openai: OpenAI | null = null;

// ✅ INITIALISER OPENAI AVEC GPT-4o OPTIMISÉ
function initializeOpenAI() {
  if (isServer && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 secondes timeout
      maxRetries: 2
    });
    console.log('✅ AIManager: OpenAI initialized with GPT-4o optimized settings');
  } else if (isServer) {
    console.error('❌ AIManager: OPENAI_API_KEY not found in environment variables');
  }
}

export class AIManager {
  private static instance: AIManager | null = null;
  private readonly errorManager: ErrorManager;
  private readonly knowledgeBase: KnowledgeBaseService;

  private constructor() {
    this.errorManager = ErrorManager.getInstance();
    this.knowledgeBase = KnowledgeBaseService.getInstance();
    if (isServer) {
      initializeOpenAI();
    }
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE ET OPTIMISÉE pour VIENS ON S'CONNAÎT
  async handleProductChatbot(
    message: CustomerMessage,
    productId: string,
    productName: string,
    currentStep: ConversationStep = 'initial',
    orderData: Partial<OrderData> = {}
  ): Promise<AIResponse> {
    try {
      console.log('🤖 AIManager processing for VIENS ON S\'CONNAÎT with GPT-4o:', {
        message: message.content.substring(0, 50),
        productId,
        productName: `le jeu ${productName}`,
        currentStep
      });

      // ✅ ÉTAPE 1: PRIORITÉ ABSOLUE À GPT-4o
      console.log('🧠 PRIORITY: Using GPT-4o FIRST for all messages');
      
      if (!isServer) {
        return this.handleClientSideChat(message, productId, productName, currentStep, orderData);
      }

      // ✅ APPEL DIRECT GPT-4o avec prompt optimisé VIENS ON S'CONNAÎT
      try {
        const aiResponse = await this.getOptimizedGPTResponse(
          message.content,
          productId,
          productName,
          currentStep,
          orderData
        );

        if (aiResponse && aiResponse.content) {
          console.log('✅ GPT-4o response successful, bypassing knowledge base');
          return aiResponse;
        }
      } catch (gptError) {
        console.warn('⚠️ GPT-4o failed, trying knowledge base fallback:', gptError);
      }

      // ✅ ÉTAPE 2: Fallback base de connaissances seulement si GPT-4o échoue
      const knowledgeResults = await this.knowledgeBase.searchKnowledge(
        message.content,
        productId
      );

      if (knowledgeResults.length > 0 && knowledgeResults[0].relevanceScore > 0.6) {
        const bestMatch = knowledgeResults[0];
        const formattedResponse = this.knowledgeBase.formatResponse(bestMatch, `le jeu ${productName}`);
        
        console.log('✅ Knowledge base fallback used:', {
          confidence: formattedResponse.confidence,
          keywords: bestMatch.matchedKeywords
        });

        return {
          content: formattedResponse.content,
          type: 'assistant',
          choices: formattedResponse.suggestions,
          nextStep: this.determineNextStep(bestMatch.item.category, currentStep),
          metadata: {
            knowledgeBaseUsed: true,
            confidence: formattedResponse.confidence,
            matchedKeywords: bestMatch.matchedKeywords,
            fallbackUsed: true
          }
        };
      }

      // ✅ ÉTAPE 3: Fallback intelligent final
      console.log('🤖 Using intelligent fallback response');
      return this.createIntelligentFallbackResponse(`le jeu ${productName}`, message.content);

    } catch (error) {
      console.error('❌ AIManager critical error:', error);
      return this.createFallbackResponse(`le jeu ${productName}`);
    }
  }

  // ✅ RÉPONSE GPT-4o OPTIMISÉE avec contexte VIENS ON S'CONNAÎT ENRICHI
  private async getOptimizedGPTResponse(
    messageContent: string,
    productId: string,
    productName: string,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>
  ): Promise<AIResponse> {
    try {
      if (!openai) {
        initializeOpenAI();
        if (!openai) throw new Error('OpenAI not available on server');
      }

      // ✅ Récupérer les informations complètes du produit
      const productInfo = await this.getComprehensiveProductInfo(productId);
      
      // ✅ Construire le prompt système optimisé VIENS ON S'CONNAÎT
      const systemPrompt = this.buildOptimizedVOSCSystemPrompt(productInfo, productName);
      
      console.log('🚀 Making GPT-4o API call with optimized prompt');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // ✅ Utiliser explicitement GPT-4o
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageContent }
        ],
        temperature: 0.7,
        max_tokens: 400, // ✅ Augmenté pour des réponses plus complètes
        response_format: { type: "json_object" }
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) throw new Error('Empty GPT-4o response');

      const parsed = JSON.parse(result);
      
      console.log('✅ GPT-4o response parsed successfully');
      
      return {
        content: parsed.message || parsed.response || "Je suis là pour vous aider !",
        type: 'assistant',
        choices: parsed.choices || [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'J\'ai d\'autres questions'
        ],
        nextStep: (parsed.nextStep as ConversationStep) || currentStep,
        metadata: {
          aiUsed: true,
          gptModel: 'gpt-4o',
          confidence: 0.9,
          productContext: productInfo.name,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ GPT-4o API error:', error);
      throw error;
    }
  }

  // ✅ PROMPT SYSTÈME ULTRA-OPTIMISÉ POUR VIENS ON S'CONNAÎT
  private buildOptimizedVOSCSystemPrompt(productInfo: any, productName: string): string {
    const fullProductName = `le jeu ${productName}`;
    
    return `Tu es Rose, l'assistante commerciale IA experte de VIENS ON S'CONNAÎT, la marque leader de jeux de cartes relationnels au Sénégal et en Afrique.

🎯 MISSION: Répondre avec expertise, chaleur et efficacité commerciale pour convertir les visiteurs en clients satisfaits.

📋 CONTEXTE MARQUE VIENS ON S'CONNAÎT:
VIENS ON S'CONNAÎT (VOC) révolutionne les relations humaines avec des jeux de cartes (physiques + numériques) qui créent des conversations authentiques et renforcent les liens : couples, familles, amis, collègues.

📦 PRODUIT ACTUEL:
- Nom: ${fullProductName}
- Prix: ${productInfo.price || '14,000'} FCFA (≈ 22€)
- Description: ${productInfo.description || 'Jeu de 150 cartes pour renforcer les relations'}
- Public cible: ${productInfo.target_audience || 'Adultes 18+, couples, familles'}
- Règles: ${productInfo.game_rules || 'Tirez une carte, lisez la question, répondez sincèrement, échangez'}

🌟 CARACTÉRISTIQUES PREMIUM COMMUNES:
- 150 cartes premium (questions + activités + défis)
- Format 63×88mm, finition mate, impression locale responsable
- Durée modulable: 15 min (express) à 2h+ (marathon)
- Livraison: GRATUITE à Dakar, 2500 FCFA ailleurs au Sénégal
- Résultats: Conversations plus profondes dès la première partie

💡 EXPERTISE CONVERSATIONNELLE:
- Tu connais parfaitement tous les jeux VOC et leurs spécificités
- Tu adaptes tes conseils selon le profil relationnel du client
- Tu utilises la psychologie positive pour motiver l'achat
- Tu résolves les objections avec empathie et preuves sociales

🎨 STYLE DE COMMUNICATION:
- Ton: Chaleureux, professionnel, typiquement sénégalais/africain
- Approche: Consultative et orientée bénéfices relationnels
- Structure: Réponse experte + question d'engagement + choix pertinents
- Émojis: Utilisés avec parcimonie pour la chaleur humaine

🚀 RÈGLES ABSOLUES:
1. TOUJOURS dire "le jeu" avant le nom du produit
2. Mettre l'accent sur les bénéfices relationnels concrets
3. Utiliser des exemples concrets et culturellement adaptés
4. Finir par une question engageante pour poursuivre la conversation
5. Proposer l'achat ou l'app mobile aux moments opportuns
6. Répondre en français avec des expressions locales authentiques

💰 ARGUMENTS COMMERCIAUX PUISSANTS:
- Investissement dans la qualité relationnelle (pas un simple achat)
- Créé par des experts en psychologie relationnelle
- Testé et approuvé par des milliers de couples/familles africains
- Alternative "zéro écran" aux divertissements digitaux
- Moments de qualité garantis dès la première utilisation

📱 ALTERNATIVES DIGITALES:
- App mobile VOC avec tous les jeux + contenu exclusif
- Disponible sur App Store, parfaite pour les déplacements
- Synchronisation famille/couple possible

⚡ FORMAT DE RÉPONSE OBLIGATOIRE:
Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "message": "Ta réponse experte et engageante",
  "choices": ["Choix 1 pertinent", "Choix 2 orienté achat", "Choix 3 informatif"],
  "nextStep": "étape_logique_suivante"
}

🎯 OBJECTIF: Chaque réponse doit faire progresser le visiteur vers l'achat ou approfondir sa connaissance du produit pour une conversion future.`;
  }

  // ✅ RÉCUPÉRATION COMPLÈTE DES INFOS PRODUIT avec données enrichies
  private async getComprehensiveProductInfo(productId: string): Promise<any> {
    try {
      // ✅ Récupérer toutes les données produit pertinentes
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          name, 
          description, 
          price, 
          target_audience, 
          game_rules, 
          benefits,
          images,
          rating
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        console.warn('⚠️ Product info error:', productError);
        return { name: 'Produit VOSC', price: 14000 };
      }

      // ✅ Récupérer les témoignages pour enrichir le contexte
      const { data: testimonials } = await supabase
        .from('testimonials')
        .select('content, rating, customer_name')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(3);

      // ✅ Récupérer les stats de vente pour le social proof
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', productId)
        .eq('status', 'confirmed');

      const salesCount = orders?.length || 0;
      const avgRating = testimonials && testimonials.length > 0
        ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
        : (product.rating || 5);

      return {
        ...product,
        salesCount,
        avgRating,
        testimonials: testimonials || [],
        socialProof: `${salesCount} clients satisfaits, note moyenne ${avgRating.toFixed(1)}/5`
      };
      
    } catch (error) {
      console.error('❌ Product info comprehensive error:', error);
      return { name: 'Produit VOSC', price: 14000 };
    }
  }

  // ✅ GESTION CÔTÉ CLIENT avec contexte enrichi
  private async handleClientSideChat(
    message: CustomerMessage,
    productId: string,
    productName: string,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>
  ): Promise<AIResponse> {
    try {
      console.log('🖥️ Client-side GPT-4o call with enhanced context');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.content,
          productId,
          productName,
          currentStep,
          orderData,
          sessionId: orderData.session_id || Date.now().toString(),
          storeId: orderData.metadata?.storeId || 'vosc_default',
          forceAI: true, // ✅ FORCER l'utilisation de l'IA
          enhanced: true // ✅ Demander le mode enrichi
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        content: result.message || "Je suis là pour vous aider !",
        type: 'assistant',
        choices: result.choices || [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'J\'ai d\'autres questions'
        ],
        nextStep: result.nextStep || currentStep,
        metadata: {
          aiUsed: true,
          clientSide: true,
          enhanced: true
        }
      };
      
    } catch (error) {
      console.error('❌ Client-side chat error:', error);
      return this.createFallbackResponse(`le jeu ${productName}`);
    }
  }

  // ✅ DÉTERMINER L'ÉTAPE SUIVANTE intelligemment
  private determineNextStep(category: string, currentStep: ConversationStep): ConversationStep {
    const stepMap: Record<string, ConversationStep> = {
      'produit': 'product_info_shown',
      'prix': 'price_explained',
      'livraison': 'delivery_info_shown',
      'paiement': 'payment_method',
      'jeu': 'game_rules_shown',
      'regles': 'game_rules_shown',
      'benefices': 'benefits_shown',
      'app': 'app_promotion',
      'testimonials': 'testimonials_shown',
      'couple': 'target_audience_shown',
      'famille': 'target_audience_shown',
      'commande': 'express_quantity'
    };
    
    return stepMap[category] || 'ai_response';
  }

  // ✅ FALLBACK INTELLIGENT CONTEXTUEL
  private createIntelligentFallbackResponse(productName: string, userMessage: string): AIResponse {
    const messageLower = userMessage.toLowerCase();
    
    let content = '';
    let suggestedChoices = [];
    
    if (messageLower.includes('prix') || messageLower.includes('coût')) {
      content = `💰 **Prix du ${productName}**\n\n14,000 FCFA avec livraison gratuite à Dakar ! C'est un investissement dans la qualité de vos relations.\n\nQue pensez-vous de ce tarif ?`;
      suggestedChoices = ['Je veux l\'acheter maintenant', 'Comment y jouer ?', 'Voir les témoignages'];
    }
    else if (messageLower.includes('livraison')) {
      content = `🚚 **Livraison du ${productName}**\n\n✅ GRATUITE à Dakar (24h)\n✅ 2,500 FCFA ailleurs au Sénégal (48-72h)\n\nDans quelle ville êtes-vous ?`;
      suggestedChoices = ['Je suis à Dakar', 'Je veux l\'acheter maintenant', 'Autres questions'];
    }
    else if (messageLower.includes('couple') || messageLower.includes('relation')) {
      content = `💕 **${productName} pour couples**\n\nPerfait pour renforcer votre complicité ! Les questions sont conçues pour approfondir votre connaissance mutuelle.\n\nDepuis combien de temps êtes-vous ensemble ?`;
      suggestedChoices = ['Je veux l\'acheter maintenant', 'Comment y jouer ?', 'Voir les témoignages'];
    }
    else {
      content = `✨ **Excellente question sur ${productName} !**\n\nCe jeu transforme vos conversations ordinaires en moments profonds et authentiques. Des milliers de couples et familles l'adorent !\n\nQue souhaitez-vous savoir ?`;
      suggestedChoices = ['Comment y jouer ?', 'Je veux l\'acheter maintenant', 'J\'ai d\'autres questions'];
    }

    return {
      content,
      type: 'assistant',
      choices: suggestedChoices,
      nextStep: 'intelligent_fallback',
      metadata: {
        intelligentFallback: true,
        contextualResponse: true
      }
    };
  }

  // ✅ RÉPONSE DE FALLBACK FINALE
  private createFallbackResponse(productName: string): AIResponse {
    return {
      content: `✨ **Je comprends votre question sur ${productName}**\n\nLaissez-moi vous orienter vers les informations les plus utiles pour vous aider !`,
      type: 'assistant',
      choices: [
        'Comment y jouer ?',
        'Je veux l\'acheter maintenant',
        'Voir les témoignages',
        'J\'ai d\'autres questions'
      ],
      nextStep: 'question_redirect',
      metadata: {
        fallbackUsed: true,
        reason: 'AI_processing_failed'
      }
    };
  }
}