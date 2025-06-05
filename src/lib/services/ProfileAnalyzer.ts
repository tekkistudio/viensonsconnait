// src/lib/services/ProfileAnalyzer.ts

export interface ProfileAnalysisResult {
  intent?: number;
  topics?: string[];
  concerns?: string[];
  interests?: string[];
  relationshipStatus?: string[];
  pricePreference?: 'economic' | 'standard' | 'premium';
  recommendedProducts?: string[];
}

export class ProfileAnalyzer {
  private static instance: ProfileAnalyzer;
  
  private readonly relationshipKeywords = {
    married: ['marié', 'mariage', 'époux', 'épouse', 'conjoint'],
    dating: ['couple', 'petit ami', 'petite amie', 'fiancé', 'relation'],
    family: ['famille', 'parent', 'enfant', 'frère', 'soeur'],
    friendship: ['ami', 'amitié', 'copain', 'collègue', 'camarade']
  };

  private readonly buyingIntentKeywords = [
    'acheter', 'commander', 'prix', 'coût', 'payer',
    'livraison', 'intéressé', 'prendre', 'cadeau'
  ];

  private readonly concernKeywords = [
    'prix', 'qualité', 'livraison', 'délai', 'paiement',
    'sécurité', 'confiance', 'garantie', 'retour'
  ];

  private readonly productMappings: Record<string, string[]> = {
    married: ['maries', 'couples'],
    dating: ['couples', 'stvalentin'],
    family: ['famille', 'amis'],
    friendship: ['amis', 'collegues']
  };

  public static getInstance(): ProfileAnalyzer {
    if (!ProfileAnalyzer.instance) {
      ProfileAnalyzer.instance = new ProfileAnalyzer();
    }
    return ProfileAnalyzer.instance;
  }

  private detectKeywords(messages: string[]): string[] {
    const keywords: string[] = [];
    
    messages.forEach(message => {
      Object.entries(this.relationshipKeywords).forEach(([category, words]) => {
        if (words.some(word => message.toLowerCase().includes(word))) {
          keywords.push(category);
        }
      });
    });

    return [...new Set(keywords)];
  }

  private detectConcerns(messages: string[]): string[] {
    const concerns: string[] = [];
    
    messages.forEach(message => {
      this.concernKeywords.forEach(concern => {
        if (message.toLowerCase().includes(concern)) {
          concerns.push(concern);
        }
      });
    });

    return [...new Set(concerns)];
  }

  private calculateBuyingIntent(messages: string[]): number {
    return Math.min(1, messages.reduce((intent, msg) => {
      const matches = this.buyingIntentKeywords.filter(keyword => 
        msg.toLowerCase().includes(keyword)
      ).length;
      return intent + (matches * 0.2);
    }, 0));
  }

  private determineRelationshipStatus(keywords: string[]): string[] {
    return keywords.filter(keyword => 
      Object.keys(this.productMappings).includes(keyword)
    );
  }

  private detectPricePreference(messages: string[]): 'economic' | 'standard' | 'premium' | undefined {
    const budget = messages.some(msg => 
      msg.toLowerCase().includes('budget') || 
      msg.toLowerCase().includes('économique') ||
      msg.toLowerCase().includes('pas cher')
    );
    
    const premium = messages.some(msg => 
      msg.toLowerCase().includes('premium') || 
      msg.toLowerCase().includes('luxe') ||
      msg.toLowerCase().includes('qualité')
    );
    
    if (budget) return 'economic';
    if (premium) return 'premium';
    return 'standard';
  }

  private async getProductRecommendations(
    status: string[],
    interests: string[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    status.forEach(stat => {
      const mappedProducts = this.productMappings[stat] || [];
      recommendations.push(...mappedProducts);
    });

    return [...new Set(recommendations)];
  }

  public async analyzeProfile(messages: string[]): Promise<ProfileAnalysisResult> {
    const detectedKeywords = this.detectKeywords(messages);
    const relationshipStatus = this.determineRelationshipStatus(detectedKeywords);
    const recommendedProducts = await this.getProductRecommendations(
      relationshipStatus,
      detectedKeywords
    );
    const pricePreference = this.detectPricePreference(messages);
    const concerns = this.detectConcerns(messages);
    const intent = this.calculateBuyingIntent(messages);

    return {
      intent,
      topics: detectedKeywords,
      concerns,
      interests: detectedKeywords,
      relationshipStatus,
      pricePreference,
      recommendedProducts
    };
  }
}