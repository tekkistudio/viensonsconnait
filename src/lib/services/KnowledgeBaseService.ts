// src/lib/services/KnowledgeBaseService.ts - VERSION FINALE ADAPTÉE À LA STRUCTURE DB
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

  // ✅ Recherche intelligente avec trigger_keywords ARRAY
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
      
      const results: SearchResult[] = [];
      
      for (const item of this.cache) {
        // Filtrer par catégorie si spécifiée
        if (category && item.category !== category) continue;
        
        const score = this.calculateRelevanceScore(queryWords, item);
        
        if (score > 0.3) { // Seuil de pertinence
          results.push({
            item,
            relevanceScore: score,
            matchedKeywords: this.getMatchedKeywords(queryWords, item)
          });
        }
      }
      
      // Trier par score de pertinence et priorité
      return results.sort((a, b) => {
        const scoreDiff = b.relevanceScore - a.relevanceScore;
        if (Math.abs(scoreDiff) < 0.1) {
          return b.item.priority - a.item.priority;
        }
        return scoreDiff;
      });
      
    } catch (error) {
      console.error('❌ KnowledgeBase search error:', error);
      return [];
    }
  }

  // ✅ Calcul de pertinence adapté aux ARRAY PostgreSQL
  private calculateRelevanceScore(queryWords: string[], item: KnowledgeBaseItem): number {
    let score = 0;
    
    // S'assurer que trigger_keywords est un array
    const triggerKeywords = Array.isArray(item.trigger_keywords) 
      ? item.trigger_keywords.map(k => k.toLowerCase())
      : [];
    
    // Score basé sur trigger_keywords (poids fort)
    for (const keyword of triggerKeywords) {
      for (const queryWord of queryWords) {
        if (keyword.includes(queryWord) || queryWord.includes(keyword)) {
          score += 0.8;
        }
        // Correspondance exacte
        if (keyword === queryWord) {
          score += 1.0;
        }
      }
    }
    
    // Score basé sur la question (poids moyen)
    const questionLower = item.question.toLowerCase();
    for (const queryWord of queryWords) {
      if (questionLower.includes(queryWord)) {
        score += 0.4;
      }
    }
    
    // Score basé sur la réponse (poids faible)
    const answerLower = item.answer.toLowerCase();
    for (const queryWord of queryWords) {
      if (answerLower.includes(queryWord)) {
        score += 0.2;
      }
    }
    
    // Bonus pour correspondance multi-mots
    const queryPhrase = queryWords.join(' ');
    if (triggerKeywords.some((k: string) => k.includes(queryPhrase))) {
      score += 0.5;
    }
    
    return Math.min(score, 2.0); // Plafonner à 2.0
  }

  // ✅ Identifier les mots-clés correspondants avec ARRAY PostgreSQL
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

  // ✅ Cache intelligent pour performance
  private async ensureCache(): Promise<void> {
    const now = Date.now();
    
    if (this.cache.length === 0 || (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
      await this.refreshCache();
    }
  }

  // ✅ Refresh cache adapté à la structure exacte
  private async refreshCache(): Promise<void> {
    try {
      console.log('🔄 Refreshing knowledge base cache...');
      
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('priority', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No knowledge base data found');
        this.cache = [];
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
        console.log('📋 First knowledge item:', {
          category: this.cache[0].category,
          triggerKeywords: this.cache[0].trigger_keywords,
          question: this.cache[0].question.substring(0, 50)
        });
      }
      
      // Debug: afficher les catégories trouvées
      const categories = [...new Set(this.cache.map(item => item.category))];
      console.log('📂 Categories found:', categories);
      
    } catch (error) {
      console.error('❌ Failed to refresh knowledge base cache:', error);
      // En cas d'erreur, initialiser un cache vide pour éviter les crashes
      this.cache = [];
      this.lastCacheUpdate = Date.now();
    }
  }

  // ✅ Recherche par catégorie spécifique
  public async getByCategory(category: string): Promise<KnowledgeBaseItem[]> {
    await this.ensureCache();
    return this.cache.filter((item: KnowledgeBaseItem) => item.category === category);
  }

  // ✅ Obtenir une réponse formatée avec suggestions
  public formatResponse(result: SearchResult, productName?: string): {
    content: string;
    suggestions: string[];
    confidence: number;
  } {
    let content = result.item.answer;
    
    // Remplacer les variables dynamiques
    if (productName) {
      content = content
        .replace(/\{product_name\}/g, `le jeu ${productName}`)
        .replace(/\{jeu_name\}/g, `le jeu ${productName}`)
        .replace(/\{nom_produit\}/g, `le jeu ${productName}`);
    }
    
    // Ajouter le contexte des mots-clés trouvés si pertinent
    if (result.matchedKeywords.length > 0 && result.relevanceScore > 0.8) {
      console.log(`🔍 Mots-clés identifiés : ${result.matchedKeywords.join(', ')}`);
    }
    
    // S'assurer que next_suggestions est un array
    const suggestions = Array.isArray(result.item.next_suggestions) && result.item.next_suggestions.length > 0
      ? result.item.next_suggestions 
      : [
          'Je veux l\'acheter maintenant',
          'J\'ai d\'autres questions',
          'Comment y jouer ?'
        ];
    
    return {
      content,
      suggestions,
      confidence: result.relevanceScore
    };
  }

  // ✅ Méthode pour ajouter un nouvel élément
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
      return true;
      
    } catch (error) {
      console.error('❌ Failed to add knowledge item:', error);
      return false;
    }
  }

  // ✅ Méthode pour vider le cache (utile pour les tests)
  public clearCache(): void {
    this.cache = [];
    this.lastCacheUpdate = 0;
    console.log('🧹 Knowledge base cache cleared');
  }

  // ✅ Méthode pour obtenir les statistiques du cache
  public getCacheStats(): {
    itemCount: number;
    lastUpdate: Date;
    categories: string[];
  } {
    return {
      itemCount: this.cache.length,
      lastUpdate: new Date(this.lastCacheUpdate),
      categories: [...new Set(this.cache.map((item: KnowledgeBaseItem) => item.category))]
    };
  }

  // ✅ Méthode de debug pour afficher tout le cache
  public debugCache(): void {
    console.log('🔍 Knowledge Base Cache Debug:');
    console.log(`Total items: ${this.cache.length}`);
    
    this.cache.forEach((item, index) => {
      console.log(`${index + 1}. [${item.category}] ${item.question}`);
      console.log(`   Keywords: ${item.trigger_keywords.join(', ')}`);
      console.log(`   Priority: ${item.priority}`);
    });
  }
}