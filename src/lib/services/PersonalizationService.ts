// src/lib/services/PersonalizationService.ts - SERVICE DE PERSONNALISATION CONTEXTUELLE

import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep, ProductData } from '@/types/chat';

interface UserProfile {
  relationshipStatus: 'single' | 'couple' | 'married' | 'family' | 'friends' | 'professional' | 'unknown';
  interests: string[];
  concerns: string[];
  mentionedTopics: string[];
  priceRange: 'budget' | 'standard' | 'premium';
  communicationStyle: 'formal' | 'casual' | 'friendly';
  buyingSignals: string[];
  sessionDuration: number;
  messageCount: number;
  lastActivity: Date;
}

interface PersonalizationContext {
  sessionId: string;
  productId: string;
  productName: string;
  conversationHistory: ChatMessage[];
  currentProfile: UserProfile;
}

interface PersonalizedRecommendation {
  productId: string;
  name: string;
  reason: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  personalizedMessage: string;
}

export class PersonalizationService {
  private static instance: PersonalizationService;
  private userProfiles = new Map<string, UserProfile>();

  private constructor() {
    console.log('🎯 PersonalizationService initialized');
  }

  public static getInstance(): PersonalizationService {
    if (!this.instance) {
      this.instance = new PersonalizationService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE: Analyser et mettre à jour le profil utilisateur
  public analyzeUserMessage(
    sessionId: string,
    message: string,
    conversationHistory: ChatMessage[]
  ): UserProfile {
    let profile = this.userProfiles.get(sessionId) || this.createDefaultProfile();
    
    // ✅ Détecter le statut relationnel
    profile.relationshipStatus = this.detectRelationshipStatus(message, conversationHistory);
    
    // ✅ Extraire les intérêts et préoccupations
    profile.interests = this.extractInterests(message, profile.interests);
    profile.concerns = this.extractConcerns(message, profile.concerns);
    profile.mentionedTopics = this.extractTopics(message, profile.mentionedTopics);
    
    // ✅ Analyser le style de communication
    profile.communicationStyle = this.detectCommunicationStyle(message);
    
    // ✅ Détecter les signaux d'achat
    profile.buyingSignals = this.detectBuyingSignals(message, profile.buyingSignals);
    
    // ✅ Analyser la sensibilité au prix
    profile.priceRange = this.detectPriceRange(message, conversationHistory);
    
    // ✅ Mettre à jour les métadonnées de session
    profile.messageCount++;
    profile.lastActivity = new Date();
    
    this.userProfiles.set(sessionId, profile);
    
    console.log('🎯 Updated user profile:', {
      sessionId: sessionId.substring(0, 8) + '...',
      relationshipStatus: profile.relationshipStatus,
      interests: profile.interests.slice(0, 3),
      buyingSignals: profile.buyingSignals.length
    });
    
    return profile;
  }

  // ✅ MÉTHODE: Générer des recommandations personnalisées
  public async generatePersonalizedRecommendations(
    context: PersonalizationContext
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const { currentProfile, productId } = context;
      
      // ✅ Récupérer les produits selon le profil
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, metadata')
        .eq('status', 'active')
        .neq('id', productId);

      if (error || !products) {
        console.error('❌ Error fetching products for personalization:', error);
        return [];
      }

      // ✅ Scorer et trier les produits selon le profil
      const scoredProducts = products.map(product => {
        const score = this.calculatePersonalizationScore(product, currentProfile);
        const recommendation = this.generatePersonalizedMessage(product, currentProfile);
        
        return {
          productId: product.id,
          name: product.name,
          reason: recommendation.reason,
          confidence: score,
          priority: score > 0.8 ? 'high' as const : score > 0.5 ? 'medium' as const : 'low' as const,
          personalizedMessage: recommendation.message
        };
      });

      // ✅ Retourner les 3 meilleures recommandations
      return scoredProducts
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

    } catch (error) {
      console.error('❌ Error generating personalized recommendations:', error);
      return [];
    }
  }

  // ✅ MÉTHODE: Personnaliser un message selon le profil
  public personalizeMessage(
    baseMessage: string,
    profile: UserProfile,
    context: { productName: string; step: ConversationStep }
  ): string {
    let personalizedMessage = baseMessage;
    
    // ✅ Adapter selon le statut relationnel
    if (profile.relationshipStatus === 'couple' || profile.relationshipStatus === 'married') {
      personalizedMessage = personalizedMessage.replace(
        'nos jeux', 
        'nos jeux parfaits pour les couples'
      );
    } else if (profile.relationshipStatus === 'family') {
      personalizedMessage = personalizedMessage.replace(
        'nos jeux', 
        'nos jeux familiaux'
      );
    }
    
    // ✅ Adapter selon le style de communication
    if (profile.communicationStyle === 'formal') {
      personalizedMessage = personalizedMessage.replace(/😊|🎉|✨/g, '');
    }
    
    // ✅ Ajouter des références aux intérêts mentionnés
    if (profile.interests.includes('communication') && !personalizedMessage.includes('communication')) {
      personalizedMessage += '\n\nCe jeu va vraiment améliorer votre communication !';
    }
    
    return personalizedMessage;
  }

  // ✅ MÉTHODES PRIVÉES DE DÉTECTION

  private detectRelationshipStatus(
    message: string, 
    history: ChatMessage[]
  ): UserProfile['relationshipStatus'] {
    const messageLower = message.toLowerCase();
    const fullText = history.map(h => typeof h.content === 'string' ? h.content : '').join(' ').toLowerCase();
    
    // Mots-clés pour couples
    if (messageLower.match(/couple|mari|femme|époux|épouse|fiancé|copain|copine|relation amoureuse/)) {
      return 'couple';
    }
    
    // Mots-clés pour famille
    if (messageLower.match(/famille|enfant|parent|papa|maman|fils|fille|frère|sœur/)) {
      return 'family';
    }
    
    // Mots-clés pour amis
    if (messageLower.match(/ami|amie|pote|copain(?!e)|groupe d'amis/)) {
      return 'friends';
    }
    
    // Mots-clés professionnels
    if (messageLower.match(/équipe|collègue|travail|bureau|entreprise|professionnel/)) {
      return 'professional';
    }
    
    return 'unknown';
  }

  private extractInterests(message: string, currentInterests: string[]): string[] {
    const messageLower = message.toLowerCase();
    const interests = [...currentInterests];
    
    const interestKeywords = {
      'communication': /communic|parler|dialogue|échang/,
      'intimité': /intimité|proche|connexion|lien/,
      'famille': /famille|enfant|parent/,
      'couple': /couple|relation|amour/,
      'jeux': /jeu|jouer|divertir|amuser/,
      'développement': /développ|croi|apprendre|découvr/
    };
    
    Object.entries(interestKeywords).forEach(([interest, pattern]) => {
      if (pattern.test(messageLower) && !interests.includes(interest)) {
        interests.push(interest);
      }
    });
    
    return interests.slice(-10); // Garder seulement les 10 derniers
  }

  private extractConcerns(message: string, currentConcerns: string[]): string[] {
    const messageLower = message.toLowerCase();
    const concerns = [...currentConcerns];
    
    const concernKeywords = {
      'prix': /cher|prix|coût|budget|argent/,
      'temps': /temps|durée|long|rapide/,
      'complexité': /compliqué|difficile|simple/,
      'efficacité': /marche|fonctionne|résultat|efficace/,
      'livraison': /livraison|délai|recevoir/
    };
    
    Object.entries(concernKeywords).forEach(([concern, pattern]) => {
      if (pattern.test(messageLower) && !concerns.includes(concern)) {
        concerns.push(concern);
      }
    });
    
    return concerns.slice(-5); // Garder seulement les 5 derniers
  }

  private extractTopics(message: string, currentTopics: string[]): string[] {
    const messageLower = message.toLowerCase();
    const topics = [...currentTopics];
    
    // Extraire les sujets mentionnés
    const topicPatterns = [
      'règles', 'prix', 'livraison', 'paiement', 'qualité', 
      'témoignages', 'avis', 'garantie', 'retour'
    ];
    
    topicPatterns.forEach(topic => {
      if (messageLower.includes(topic) && !topics.includes(topic)) {
        topics.push(topic);
      }
    });
    
    return topics.slice(-15); 
  }

  private detectCommunicationStyle(message: string): UserProfile['communicationStyle'] {
    // Analyser le style de communication
    const hasEmojis = /\p{Emoji}/u.test(message);
    const hasFormalWords = /veuillez|pourriez|souhaiteriez/i.test(message);
    const hasCasualWords = /salut|coucou|ok|cool|super/i.test(message);
    
    if (hasFormalWords && !hasEmojis) return 'formal';
    if (hasCasualWords || hasEmojis) return 'casual';
    return 'friendly';
  }

  private detectBuyingSignals(message: string, currentSignals: string[]): string[] {
    const messageLower = message.toLowerCase();
    const signals = [...currentSignals];
    
    const buyingKeywords = [
      'acheter', 'commander', 'prendre', 'veux', 'intéressé', 
      'prix', 'livraison', 'paiement', 'quand', 'combien'
    ];
    
    buyingKeywords.forEach(keyword => {
      if (messageLower.includes(keyword) && !signals.includes(keyword)) {
        signals.push(keyword);
      }
    });
    
    return signals.slice(-10);
  }

  private detectPriceRange(message: string, history: ChatMessage[]): UserProfile['priceRange'] {
    const fullText = (message + ' ' + history.map(h => typeof h.content === 'string' ? h.content : '').join(' ')).toLowerCase();
    
    if (fullText.match(/cher|trop|budget|pas les moyens/)) return 'budget';
    if (fullText.match(/premium|qualité|meilleur|top/)) return 'premium';
    return 'standard';
  }

  private calculatePersonalizationScore(product: any, profile: UserProfile): number {
    let score = 0.5; // Score de base
    
    // ✅ Score basé sur le statut relationnel
    const productName = product.name.toLowerCase();
    if (profile.relationshipStatus === 'couple' && productName.includes('couple')) score += 0.3;
    if (profile.relationshipStatus === 'family' && productName.includes('famille')) score += 0.3;
    if (profile.relationshipStatus === 'friends' && productName.includes('ami')) score += 0.3;
    if (profile.relationshipStatus === 'professional' && productName.includes('professionnel')) score += 0.3;
    
    // ✅ Score basé sur les intérêts
    profile.interests.forEach(interest => {
      if (productName.includes(interest) || (product.description && product.description.toLowerCase().includes(interest))) {
        score += 0.1;
      }
    });
    
    // ✅ Score basé sur la gamme de prix
    if (profile.priceRange === 'budget' && product.price <= 14000) score += 0.1;
    if (profile.priceRange === 'premium' && product.price >= 16000) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private generatePersonalizedMessage(product: any, profile: UserProfile): { reason: string; message: string } {
    let reason = 'Recommandé pour vous';
    let message = `Le jeu ${product.name} pourrait vous plaire.`;
    
    // ✅ Personnaliser selon le profil
    if (profile.relationshipStatus === 'couple') {
      reason = 'Parfait pour renforcer votre complicité de couple';
      message = `Ce jeu va vous aider à créer des moments intimes et authentiques ensemble.`;
    } else if (profile.relationshipStatus === 'family') {
      reason = 'Idéal pour des moments en famille';
      message = `Vos enfants et vous allez adorer ces conversations familiales enrichissantes.`;
    }
    
    return { reason, message };
  }

  private createDefaultProfile(): UserProfile {
    return {
      relationshipStatus: 'unknown',
      interests: [],
      concerns: [],
      mentionedTopics: [],
      priceRange: 'standard',
      communicationStyle: 'friendly',
      buyingSignals: [],
      sessionDuration: 0,
      messageCount: 0,
      lastActivity: new Date()
    };
  }

  // ✅ MÉTHODES PUBLIQUES UTILITAIRES

  public getProfile(sessionId: string): UserProfile | null {
    return this.userProfiles.get(sessionId) || null;
  }

  public clearProfile(sessionId: string): void {
    this.userProfiles.delete(sessionId);
  }

  public getAllProfiles(): Map<string, UserProfile> {
    return new Map(this.userProfiles);
  }
}