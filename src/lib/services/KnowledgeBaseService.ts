// src/lib/services/KnowledgeBaseService.ts - VERSION OPTIMISÉE AVEC "LE JEU" SYSTÉMATIQUE

import { supabase } from '@/lib/supabase';

interface KnowledgeBaseItem {
  id: string;
  category: string;
  trigger_keywords: string[]; // ARRAY PostgreSQL
  question: string;
  answer: string;
  priority: number;
  tone: string;
  next_suggestions: string[]; // ARRAY PostgreSQL
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  item: KnowledgeBaseItem;
  relevanceScore: number;
  matchedKeywords: string[];
}

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  private cache: KnowledgeBaseItem[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): KnowledgeBaseService {
    if (!this.instance) {
      this.instance = new KnowledgeBaseService();
    }
    return this.instance;
  }

  // ✅ RECHERCHE INTELLIGENTE OPTIMISÉE avec trigger_keywords ARRAY
  public async searchKnowledge(
    query: string, 
    productId?: string,
    category?: string
  ): Promise<SearchResult[]> {
    try {
      await this.ensureCache();
      
      if (this.cache.length === 0) {
        console.warn('⚠️ Knowledge base cache is empty');
        return [];
      }
      
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter((word: string) => word.length > 2);
      
      console.log('🔍 Searching knowledge base:', {
        query: queryLower,
        queryWords,
        cacheSize: this.cache.length,
        category
      });
      
      const results: SearchResult[] = [];
      
      for (const item of this.cache) {
        // Filtrer par catégorie si spécifiée
        if (category && item.category !== category) continue;
        
        const score = this.calculateRelevanceScore(queryWords, item, queryLower);
        
        if (score > 0.3) { // Seuil de pertinence ajusté
          results.push({
            item,
            relevanceScore: score,
            matchedKeywords: this.getMatchedKeywords(queryWords, item)
          });
        }
      }
      
      // Trier par score de pertinence et priorité
      const sortedResults = results.sort((a, b) => {
        const scoreDiff = b.relevanceScore - a.relevanceScore;
        if (Math.abs(scoreDiff) < 0.1) {
          return b.item.priority - a.item.priority;
        }
        return scoreDiff;
      });

      console.log('✅ Knowledge search results:', {
        totalResults: sortedResults.length,
        topScore: sortedResults[0]?.relevanceScore || 0,
        topMatch: sortedResults[0]?.item.question.substring(0, 50) || 'None'
      });
      
      return sortedResults;
      
    } catch (error) {
      console.error('❌ KnowledgeBase search error:', error);
      return [];
    }
  }

  // ✅ CALCUL DE PERTINENCE AMÉLIORÉ avec pondération intelligente
  private calculateRelevanceScore(queryWords: string[], item: KnowledgeBaseItem, fullQuery: string): number {
    let score = 0;
    
    // S'assurer que trigger_keywords est un array
    const triggerKeywords = Array.isArray(item.trigger_keywords) 
      ? item.trigger_keywords.map(k => k.toLowerCase())
      : [];
    
    // ✅ NOUVEAU: Score basé sur correspondance phrase complète (poids maximum)
    if (triggerKeywords.some(keyword => fullQuery.includes(keyword.toLowerCase()))) {
      score += 1.5; // Bonus important pour correspondance de phrase
    }
    
    // Score basé sur trigger_keywords (poids fort)
    for (const keyword of triggerKeywords) {
      for (const queryWord of queryWords) {
        if (keyword.includes(queryWord) || queryWord.includes(keyword)) {
          score += 0.8;
        }
        // Correspondance exacte
        if (keyword === queryWord) {
          score += 1.2; // Augmenté pour les correspondances exactes
        }
      }
    }
    
    // Score basé sur la question (poids moyen)
    const questionLower = item.question.toLowerCase();
    for (const queryWord of queryWords) {
      if (questionLower.includes(queryWord)) {
        score += 0.5; // Augmenté
      }
    }
    
    // Score basé sur la réponse (poids faible)
    const answerLower = item.answer.toLowerCase();
    for (const queryWord of queryWords) {
      if (answerLower.includes(queryWord)) {
        score += 0.3; // Augmenté
      }
    }
    
    // ✅ NOUVEAU: Bonus pour correspondance multi-mots
    const queryPhrase = queryWords.join(' ');
    if (triggerKeywords.some((k: string) => k.includes(queryPhrase))) {
      score += 0.7;
    }
    
    // ✅ NOUVEAU: Bonus pour catégorie spécifique
    if (item.category && queryWords.some(word => 
      ['produit', 'jeu', 'prix', 'livraison', 'paiement'].includes(word)
    )) {
      score += 0.3;
    }
    
    return Math.min(score, 3.0); // Plafonner à 3.0
  }

  // ✅ IDENTIFIER LES MOTS-CLÉS CORRESPONDANTS AMÉLIORÉ
  private getMatchedKeywords(queryWords: string[], item: KnowledgeBaseItem): string[] {
    const matched: string[] = [];
    
    // S'assurer que trigger_keywords est un array
    const triggerKeywords = Array.isArray(item.trigger_keywords) 
      ? item.trigger_keywords 
      : [];
    
    for (const keyword of triggerKeywords) {
      for (const queryWord of queryWords) {
        if (keyword.toLowerCase().includes(queryWord) || queryWord.includes(keyword.toLowerCase())) {
          matched.push(keyword);
        }
      }
    }
    
    return [...new Set(matched)];
  }

  // ✅ CACHE INTELLIGENT OPTIMISÉ pour performance
  private async ensureCache(): Promise<void> {
    const now = Date.now();
    
    if (this.cache.length === 0 || (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
      await this.refreshCache();
    }
  }

  // ✅ REFRESH CACHE ROBUSTE avec gestion d'erreur
  private async refreshCache(): Promise<void> {
    try {
      console.log('🔄 Refreshing knowledge base cache...');
      
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('priority', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        // Ne pas throw l'erreur, garder le cache existant
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No knowledge base data found in database');
        
        // ✅ NOUVEAU: Créer un cache de base si vide
        this.cache = this.createDefaultKnowledgeBase();
        this.lastCacheUpdate = Date.now();
        return;
      }
      
      // Les données viennent directement avec les bons types depuis PostgreSQL
      this.cache = data.map((item: any): KnowledgeBaseItem => ({
        id: item.id,
        category: item.category || 'general',
        question: item.question || '',
        answer: item.answer || '',
        priority: item.priority || 0,
        tone: item.tone || 'friendly',
        trigger_keywords: Array.isArray(item.trigger_keywords) ? item.trigger_keywords : [],
        next_suggestions: Array.isArray(item.next_suggestions) ? item.next_suggestions : [],
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
      
      this.lastCacheUpdate = Date.now();
      console.log(`✅ Knowledge base cache refreshed: ${this.cache.length} items`);
      
      // Debug: afficher les premières entrées
      if (this.cache.length > 0) {
        console.log('📋 Sample knowledge items:', {
          total: this.cache.length,
          categories: [...new Set(this.cache.map(item => item.category))],
          firstItem: {
            category: this.cache[0].category,
            triggerKeywords: this.cache[0].trigger_keywords.slice(0, 3),
            question: this.cache[0].question.substring(0, 50)
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to refresh knowledge base cache:', error);
      
      // ✅ NOUVEAU: En cas d'erreur, créer un cache minimal pour éviter les crashes
      if (this.cache.length === 0) {
        this.cache = this.createDefaultKnowledgeBase();
        this.lastCacheUpdate = Date.now();
        console.log('🆘 Using default knowledge base due to error');
      }
    }
  }

  // ✅ NOUVEAU: Créer une base de connaissances par défaut
  private createDefaultKnowledgeBase(): KnowledgeBaseItem[] {
    return [
      {
        id: 'default-prix',
        category: 'prix',
        trigger_keywords: ['prix', 'coût', 'coute', 'cher', 'tarif', 'montant'],
        question: 'Quel est le prix du jeu ?',
        answer: 'Chaque jeu coûte 14,000 FCFA avec livraison gratuite à Dakar. Pour les autres villes du Sénégal, les frais de livraison sont de 2,500 FCFA.',
        priority: 10,
        tone: 'friendly',
        next_suggestions: ['Je veux l\'acheter maintenant', 'Comment y jouer ?', 'Zones de livraison'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'default-livraison',
        category: 'livraison',
        trigger_keywords: ['livraison', 'livrer', 'expédition', 'délai', 'transport'],
        question: 'Comment fonctionne la livraison ?',
        answer: 'Nous livrons partout au Sénégal ! Livraison gratuite à Dakar (24h), 2,500 FCFA ailleurs (48-72h ouvrables).',
        priority: 9,
        tone: 'friendly',
        next_suggestions: ['Je veux l\'acheter maintenant', 'Quelles villes ?', 'Modes de paiement'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'default-jeu',
        category: 'produit',
        trigger_keywords: ['jeu', 'cartes', 'comment jouer', 'règles', 'fonctionnement'],
        question: 'Comment fonctionne le jeu ?',
        answer: 'Nos jeux contiennent 150 cartes de questions pour créer des conversations authentiques. Tirez une carte, lisez la question, répondez sincèrement et échangez !',
        priority: 8,
        tone: 'friendly',
        next_suggestions: ['Je veux l\'acheter maintenant', 'C\'est pour qui ?', 'Voir les témoignages'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // ✅ RECHERCHE PAR CATÉGORIE SPÉCIFIQUE
  public async getByCategory(category: string): Promise<KnowledgeBaseItem[]> {
    await this.ensureCache();
    const results = this.cache.filter((item: KnowledgeBaseItem) => item.category === category);
    console.log(`📂 Found ${results.length} items in category: ${category}`);
    return results;
  }

  // ✅ OBTENIR UNE RÉPONSE FORMATÉE AVEC "LE JEU" SYSTÉMATIQUE
  public formatResponse(result: SearchResult, productName?: string): {
    content: string;
    suggestions: string[];
    confidence: number;
  } {
    let content = result.item.answer;
    
    // ✅ NOUVEAU: Remplacer les variables dynamiques avec "le jeu" systématique
    if (productName) {
      // S'assurer que productName commence par "le jeu"
      const fullProductName = productName.toLowerCase().startsWith('le jeu') 
        ? productName 
        : `le jeu ${productName}`;
      
      content = content
        .replace(/\{product_name\}/g, fullProductName)
        .replace(/\{jeu_name\}/g, fullProductName)
        .replace(/\{nom_produit\}/g, fullProductName);
    }
    
    // ✅ NOUVEAU: Ajouter le contexte si pertinent
    if (result.matchedKeywords.length > 0 && result.relevanceScore > 0.8) {
      console.log(`🔍 High relevance match (${result.relevanceScore}) with keywords: ${result.matchedKeywords.join(', ')}`);
    }
    
    // S'assurer que next_suggestions est un array et le rendre plus pertinent
    let suggestions = Array.isArray(result.item.next_suggestions) && result.item.next_suggestions.length > 0
      ? result.item.next_suggestions 
      : this.getDefaultSuggestions(result.item.category);
    
    // ✅ NOUVEAU: Adapter les suggestions selon la catégorie
    suggestions = this.adaptSuggestions(suggestions, result.item.category);
    
    return {
      content,
      suggestions,
      confidence: Math.min(result.relevanceScore, 1.0) // Normaliser à 1.0 max
    };
  }

  // ✅ NOUVEAU: Suggestions par défaut selon la catégorie
  private getDefaultSuggestions(category: string): string[] {
    const suggestionMap: Record<string, string[]> = {
      'prix': [
        'Je veux l\'acheter maintenant',
        'Modes de paiement disponibles',
        'Comment y jouer ?'
      ],
      'livraison': [
        'Je veux l\'acheter maintenant',
        'Quelles sont les zones ?',
        'Délais de livraison'
      ],
      'produit': [
        'Je veux l\'acheter maintenant',
        'C\'est pour qui ?',
        'Voir les témoignages'
      ],
      'jeu': [
        'Je veux l\'acheter maintenant',
        'Règles détaillées',
        'Durée d\'une partie'
      ],
      'paiement': [
        'Je veux l\'acheter maintenant',
        'Paiement Wave',
        'Paiement par carte'
      ],
      'app': [
        'Télécharger l\'app mobile',
        'Je veux l\'acheter maintenant',
        'Différence physique/digital'
      ]
    };
    
    return suggestionMap[category] || [
      'Je veux l\'acheter maintenant',
      'J\'ai d\'autres questions',
      'Comment y jouer ?'
    ];
  }

  // ✅ NOUVEAU: Adapter les suggestions selon le contexte
  private adaptSuggestions(suggestions: string[], category: string): string[] {
    // Toujours garder "Je veux l'acheter maintenant" en premier si pas présent
    if (!suggestions.some(s => s.includes('acheter'))) {
      suggestions = ['Je veux l\'acheter maintenant', ...suggestions.slice(0, 2)];
    }
    
    return suggestions.slice(0, 3); // Limiter à 3 suggestions max
  }

  // ✅ MÉTHODE pour ajouter un nouvel élément
  public async addKnowledgeItem(item: Omit<KnowledgeBaseItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Refresh cache après ajout
      await this.refreshCache();
      console.log('✅ Knowledge item added successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to add knowledge item:', error);
      return false;
    }
  }

  // ✅ MÉTHODE pour vider le cache (utile pour les tests)
  public clearCache(): void {
    this.cache = [];
    this.lastCacheUpdate = 0;
    console.log('🧹 Knowledge base cache cleared');
  }

  // ✅ MÉTHODE pour obtenir les statistiques du cache
  public getCacheStats(): {
    itemCount: number;
    lastUpdate: Date;
    categories: string[];
    isHealthy: boolean;
  } {
    const categories = [...new Set(this.cache.map((item: KnowledgeBaseItem) => item.category))];
    const isHealthy = this.cache.length > 0 && (Date.now() - this.lastCacheUpdate) < this.CACHE_DURATION * 2;
    
    return {
      itemCount: this.cache.length,
      lastUpdate: new Date(this.lastCacheUpdate),
      categories,
      isHealthy
    };
  }

  // ✅ MÉTHODE de debug pour afficher tout le cache
  public debugCache(): void {
    console.log('🔍 Knowledge Base Cache Debug:');
    console.log(`Total items: ${this.cache.length}`);
    console.log(`Cache age: ${Math.round((Date.now() - this.lastCacheUpdate) / 1000)}s`);
    
    const categoryStats = this.cache.reduce((stats, item) => {
      stats[item.category] = (stats[item.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
    
    console.log('Categories:', categoryStats);
    
    this.cache.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. [${item.category}] ${item.question}`);
      console.log(`   Keywords: ${item.trigger_keywords.join(', ')}`);
      console.log(`   Priority: ${item.priority}`);
    });
  }

  // ✅ NOUVEAU: Recherche rapide par mots-clés exacts
  public async quickSearch(keyword: string): Promise<KnowledgeBaseItem[]> {
    await this.ensureCache();
    
    const keywordLower = keyword.toLowerCase();
    return this.cache.filter(item => 
      Array.isArray(item.trigger_keywords) &&
      item.trigger_keywords.some(k => k.toLowerCase().includes(keywordLower))
    );
  }

  // ✅ NOUVEAU: Obtenir les questions les plus fréquentes
  public async getTopQuestions(limit: number = 5): Promise<KnowledgeBaseItem[]> {
    await this.ensureCache();
    
    return this.cache
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }
}