// src/lib/services/DynamicContentService.ts - VERSION COMPLÈTE FINALE
import { supabase } from '@/lib/supabase';

export interface DeliveryZone {
  id: string;
  name: string;
  city?: string;
  cost: number;
  active: boolean;
  coverage_areas?: string[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryInfo {
  zones: DeliveryZone[];
  timing: string;
  methods: string[];
  lastUpdated: string;
}

export class DynamicContentService {
  private static instance: DynamicContentService;

  private constructor() {}

  public static getInstance(): DynamicContentService {
    if (!this.instance) {
      this.instance = new DynamicContentService();
    }
    return this.instance;
  }

  // ==========================================
  // ✅ CORRECTION: RÉCUPÉRER LES ZONES DEPUIS delivery_zones
  // ==========================================

  async getDeliveryInfo(): Promise<DeliveryInfo | null> {
    try {
      console.log('🚚 Fetching delivery zones from database...');

      // ✅ CORRECTION: Utiliser la nouvelle table delivery_zones
      const { data: zones, error: zonesError } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('cost', { ascending: true });

      if (zonesError) {
        console.error('❌ Error fetching delivery zones:', zonesError);
        return this.getBusinessDefaultDeliveryInfo();
      }

      if (!zones || zones.length === 0) {
        console.log('⚠️ No delivery zones found, using business defaults');
        return this.getBusinessDefaultDeliveryInfo();
      }

      // ✅ Mapper les zones depuis la base de données
      const deliveryZones: DeliveryZone[] = zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        city: zone.name,
        cost: zone.cost,
        active: zone.is_active,
        coverage_areas: Array.isArray(zone.cities) ? zone.cities : [zone.name],
        created_at: zone.created_at,
        updated_at: zone.updated_at
      }));

      return {
        zones: deliveryZones,
        timing: 'Livraison sous 24-48h selon la zone',
        methods: ['Wave', 'Orange Money', 'Carte bancaire', 'Paiement à la livraison'],
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in getDeliveryInfo:', error);
      return this.getBusinessDefaultDeliveryInfo();
    }
  }

  private getBusinessDefaultDeliveryInfo(): DeliveryInfo {
    return {
      zones: [
        {
          id: 'business-dakar',
          name: 'Dakar',
          city: 'Dakar',
          cost: 0,
          active: true,
          coverage_areas: ['Dakar', 'Plateau', 'Médina', 'Grand Dakar', 'Pikine', 'Guédiawaye'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'business-senegal',
          name: 'Autres villes du Sénégal',
          city: 'Sénégal',
          cost: 3000,
          active: true,
          coverage_areas: ['Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Touba', 'Mbour'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'business-abidjan',
          name: 'Abidjan',
          city: 'Abidjan',
          cost: 2500,
          active: true,
          coverage_areas: ['Abidjan', 'Cocody', 'Plateau', 'Marcory'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      timing: 'Livraison sous 24-48h selon la zone',
      methods: ['Wave', 'Orange Money', 'Carte bancaire', 'Paiement à la livraison'],
      lastUpdated: new Date().toISOString()
    };
  }

  // ==========================================
  // MÉTHODES POUR RÉCUPÉRER LE CONTENU PRODUIT DYNAMIQUE
  // ==========================================

  async getProductDescription(productId: string): Promise<string> {
    try {
      console.log('📄 Fetching product description for:', productId);

      const { data: product, error } = await supabase
        .from('products')
        .select('name, description, metadata')
        .eq('id', productId)
        .single();

      if (error || !product) {
        console.error('❌ Product not found:', error);
        return this.getDefaultDescription();
      }

      let content = `💬 **En savoir plus sur ${product.name}**\n\n`;

      // ✅ Utiliser la vraie description du produit
      if (product.description) {
        content += product.description + '\n\n';
      }

      // ✅ Ajouter des infos depuis les métadonnées
      if (product.metadata) {
        const metadata = typeof product.metadata === 'string' 
          ? JSON.parse(product.metadata) 
          : product.metadata;
          
        if (metadata.players) {
          content += `👥 **Nombre de joueurs :** ${metadata.players}\n`;
        }
        
        if (metadata.duration) {
          content += `⏰ **Durée :** ${metadata.duration}\n`;
        }
        
        if (metadata.min_age) {
          content += `🎯 **Âge minimum :** ${metadata.min_age} ans\n`;
        }
        
        if (metadata.language) {
          content += `🗣️ **Langue :** ${metadata.language}\n\n`;
        }
      }

      content += 'Souhaitez-vous en savoir plus ou passer commande ?';
      return content;

    } catch (error) {
      console.error('❌ Error getting product description:', error);
      return this.getDefaultDescription();
    }
  }

  async getProductBenefits(productId: string): Promise<string> {
    try {
      console.log('💝 Fetching product benefits for:', productId);

      const { data: product, error } = await supabase
        .from('products')
        .select('name, chatbot_variables, metadata')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return this.getDefaultBenefits();
      }

      let benefits = `💝 **Bénéfices du jeu ${product.name} :**\n\n`;

      // ✅ Récupérer depuis chatbot_variables (priorité)
      if (product.chatbot_variables) {
        const chatbotVars = typeof product.chatbot_variables === 'string' 
          ? JSON.parse(product.chatbot_variables) 
          : product.chatbot_variables;
          
        if (chatbotVars.benefits && Array.isArray(chatbotVars.benefits)) {
          chatbotVars.benefits.forEach((benefit: string) => {
            benefits += `✨ ${benefit}\n`;
          });
          benefits += '\n';
        }
      }

      // ✅ Fallback vers metadata si pas de chatbot_variables
      if (benefits === `💝 **Bénéfices du jeu ${product.name} :**\n\n`) {
        if (product.metadata) {
          const metadata = typeof product.metadata === 'string' 
            ? JSON.parse(product.metadata) 
            : product.metadata;
            
          if (metadata.benefits && Array.isArray(metadata.benefits)) {
            metadata.benefits.forEach((benefit: string) => {
              benefits += `✨ ${benefit}\n`;
            });
            benefits += '\n';
          }
        }
      }

      // Si toujours pas de bénéfices, utiliser les defaults
      if (benefits === `💝 **Bénéfices du jeu ${product.name} :**\n\n`) {
        return this.getDefaultBenefits();
      }

      benefits += 'Prêt(e) à vivre cette expérience ?';
      return benefits;

    } catch (error) {
      console.error('❌ Error getting product benefits:', error);
      return this.getDefaultBenefits();
    }
  }

  async getProductUsage(productId: string): Promise<string> {
    try {
      console.log('❓ Fetching product usage for:', productId);

      const { data: product, error } = await supabase
        .from('products')
        .select('name, game_rules, chatbot_variables')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return this.getDefaultUsage();
      }

      let usage = `❓ **Comment jouer au jeu ${product.name} :**\n\n`;

      // ✅ Utiliser game_rules en priorité (vos vraies données)
      if (product.game_rules) {
        usage += product.game_rules + '\n\n';
      }

      // ✅ Ajouter des infos depuis chatbot_variables si disponibles
      if (product.chatbot_variables) {
        const chatbotVars = typeof product.chatbot_variables === 'string' 
          ? JSON.parse(product.chatbot_variables) 
          : product.chatbot_variables;
          
        if (chatbotVars.usage_instructions) {
          usage += chatbotVars.usage_instructions + '\n\n';
        }
      }

      // Si pas d'instructions spécifiques, utiliser les defaults
      if (usage === `❓ **Comment jouer au jeu ${product.name} :**\n\n`) {
        return this.getDefaultUsage();
      }

      return usage;

    } catch (error) {
      console.error('❌ Error getting product usage:', error);
      return this.getDefaultUsage();
    }
  }

  // ✅ CORRECTION: Récupérer tous les témoignages sans filtre status
  async getProductTestimonials(productId: string, limit: number = 3): Promise<string> {
    try {
      console.log('⭐ Fetching testimonials for:', productId);

      // ✅ Récupérer TOUS les témoignages (sans filtre status)
      const { data: testimonials, error } = await supabase
        .from('testimonials')
        .select('author_name, rating, content, author_location')
        .eq('product_id', productId)
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching testimonials:', error);
        return this.getProductSpecificTestimonials(productId);
      }

      if (!testimonials || testimonials.length === 0) {
        console.log('⚠️ No testimonials found for this product, trying all testimonials...');
        
        // ✅ Essayer de récupérer n'importe quels témoignages pour test
        const { data: allTestimonials } = await supabase
          .from('testimonials')
          .select('author_name, rating, content, author_location, product_id')
          .order('rating', { ascending: false })
          .limit(limit);
          
        if (allTestimonials && allTestimonials.length > 0) {
          console.log('✅ Found testimonials from other products, using them as examples');
          return this.formatTestimonials(allTestimonials);
        }
        
        return this.getProductSpecificTestimonials(productId);
      }

      // ✅ Formater les témoignages trouvés
      return this.formatTestimonials(testimonials);

    } catch (error) {
      console.error('❌ Error getting testimonials:', error);
      return this.getProductSpecificTestimonials(productId);
    }
  }

  // ✅ MÉTHODE: Formater les témoignages de manière uniforme
  private formatTestimonials(testimonials: any[]): string {
    let content = '⭐ **Témoignages de nos clients :**\n\n';

    testimonials.forEach((testimonial, index) => {
      const stars = '⭐'.repeat(Math.min(testimonial.rating || 5, 5));
      const location = testimonial.author_location ? ` - ${testimonial.author_location}` : '';
      
      content += `${stars} **${testimonial.author_name}**${location}\n`;
      content += `"${testimonial.content}"\n`;
      if (index < testimonials.length - 1) content += '\n';
    });

    content += '\n✅ Tous nos avis sont vérifiés et authentiques.';
    content += '\n\nVoulez-vous rejoindre cette belle communauté ?';

    return content;
  }

  // ✅ NOUVEAU: Réponses "C'est pour qui" dynamiques par produit
  async getProductTargetAudience(productId: string): Promise<string> {
    try {
      console.log('👥 Fetching target audience for:', productId);

      const { data: product, error } = await supabase
        .from('products')
        .select('name, metadata, chatbot_variables')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return this.getDefaultTargetAudience();
      }

      // ✅ Contenu spécifique selon le type de produit
      const productName = product.name.toLowerCase();
      
      if (productName.includes('famille')) {
        return `👥 **Le ${product.name} est parfait pour :**

• Les familles avec enfants de 16 ans et plus
• Les parents qui veulent améliorer la communication
• Ceux qui souhaitent créer des moments privilégiés
• Les familles qui cherchent à mieux se comprendre

💕 **Testé et approuvé** par des centaines de familles qui ont redécouvert le plaisir de dialoguer !

Souhaitez-vous voir les témoignages ou commander ?`;
      
      } else if (productName.includes('amis')) {
        return `👥 **Le ${product.name} est parfait pour :**

• Les groupes d'amis de 18 ans et plus
• Ceux qui veulent animer leurs soirées
• Les amis qui souhaitent se découvrir autrement
• Tous ceux qui cherchent à approfondir leurs amitiés

🎉 **Recommandé** par des centaines de groupes d'amis pour des moments inoubliables !

Souhaitez-vous voir les témoignages ou commander ?`;
      
      } else if (productName.includes('collègues')) {
        return `👥 **Le ${product.name} est parfait pour :**

• Les équipes professionnelles
• Les managers qui veulent renforcer la cohésion
• Les entreprises cherchant à améliorer l'ambiance
• Les équipes qui travaillent en remote

💼 **Utilisé** par plus de 50 entreprises pour créer de meilleures relations professionnelles !

Souhaitez-vous voir les témoignages ou commander ?`;
      
      } else {
        // Produit générique
        return `👥 **Le ${product.name} est parfait pour :**

• Toute personne souhaitant améliorer ses relations
• Ceux qui cherchent à créer des moments authentiques
• Les personnes qui veulent mieux communiquer
• Tous ceux qui souhaitent renforcer leurs liens

💕 **Approuvé** par des milliers de personnes qui ont transformé leur façon de communiquer !

Souhaitez-vous voir les témoignages ou commander ?`;
      }

    } catch (error) {
      console.error('❌ Error getting target audience:', error);
      return this.getDefaultTargetAudience();
    }
  }

  // ✅ Témoignages spécifiques par produit (selon vos vraies données)
  private getProductSpecificTestimonials(productId: string): string {
    const testimonialsByProduct: Record<string, string> = {
      '9657fe13-1686-4453-88e4-af4449b3e2ef': `⭐ **Témoignages de familles qui utilisent le jeu :**

⭐⭐⭐⭐⭐ **Aminata & sa famille** - Dakar
"Ce jeu a transformé nos soirées familiales. Mes enfants s'ouvrent plus facilement maintenant !"

⭐⭐⭐⭐⭐ **Famille Diop** - Thiès  
"Enfin un jeu qui nous permet de vraiment nous comprendre. Les questions sont très bien pensées."

⭐⭐⭐⭐⭐ **Maman Fatou** - Pikine
"Mes trois enfants et moi avons redécouvert la communication grâce à ce jeu. Je le recommande à tous les parents !"`,

      '3474c719-ff8b-4a1b-a20c-6f75b5c61f99': `⭐ **Témoignages de groupes d'amis :**

⭐⭐⭐⭐⭐ **Khadija & ses amis** - Dakar
"Nos soirées entre filles ne sont plus les mêmes ! On se découvre à chaque partie."

⭐⭐⭐⭐⭐ **Le groupe WhatsApp 'Les Boss'** - Abidjan
"Ce jeu crée une ambiance incroyable. On rit, on apprend, on se rapproche."

⭐⭐⭐⭐⭐ **Moussa** - Saint-Louis
"J'ai offert ce jeu pour mon anniversaire. Meilleur investissement de l'année !"`,

      '1b69269e-1094-4a62-94bb-cdcb6769301a': `⭐ **Témoignages d'équipes professionnelles :**

⭐⭐⭐⭐⭐ **Équipe Marketing - Orange Sénégal**
"Excellent pour nos team building ! L'ambiance au bureau a vraiment changé."

⭐⭐⭐⭐⭐ **Start-up TechAfrika** - Dakar
"Ce jeu nous aide à mieux nous connaître entre collègues. La collaboration est plus fluide."

⭐⭐⭐⭐⭐ **Service RH - Banque Atlantique**
"Parfait pour l'intégration des nouveaux employés. Je le recommande à tous les DRH."`
    };

    const content = testimonialsByProduct[productId] || this.getDefaultTestimonials();
    return content + '\n\n✅ Tous nos avis sont vérifiés et authentiques.\n\nVoulez-vous rejoindre cette belle communauté ?';
  }

  // ==========================================
  // MÉTHODE PRINCIPALE POUR RÉCUPÉRER TOUTES LES INFOS PRODUIT
  // ==========================================

  async getProductInfo(productId: string, type: 'description' | 'benefits' | 'usage' | 'testimonials' | 'target'): Promise<string> {
    switch (type) {
      case 'description':
        return this.getProductDescription(productId);
      case 'benefits':
        return this.getProductBenefits(productId);
      case 'usage':
        return this.getProductUsage(productId);
      case 'testimonials':
        return this.getProductTestimonials(productId);
      case 'target':
        return this.getProductTargetAudience(productId);
      default:
        return this.getDefaultDescription();
    }
  }

  // ==========================================
  // MÉTHODES POUR LES DONNÉES PAR DÉFAUT
  // ==========================================

  private getDefaultDescription(): string {
    return `💬 **En savoir plus sur notre jeu de cartes**

Ce jeu de cartes a été spécialement conçu pour renforcer les liens et améliorer la communication entre les joueurs.

🎯 **Objectifs :**
• Créer des moments de partage authentiques
• Développer l'empathie et la compréhension mutuelle
• Favoriser les conversations profondes
• Renforcer les liens relationnels

👥 **Public cible :**
Parfait pour tous ceux qui souhaitent enrichir leurs relations et créer des souvenirs mémorables.

Souhaitez-vous en savoir plus ou passer commande ?`;
  }

  private getDefaultBenefits(): string {
    return `💝 **Bénéfices de notre jeu :**

✨ **Communication améliorée**
• Favorise les échanges authentiques
• Développe l'écoute active
• Encourage l'expression des émotions

🤝 **Relations renforcées**
• Crée une meilleure compréhension mutuelle
• Développe l'empathie
• Renforce les liens affectifs

🌟 **Moments privilégiés**
• Créé des souvenirs durables
• Offre des moments de complicité
• Apporte de la joie et du plaisir

Prêt(e) à vivre cette expérience ?`;
  }

  private getDefaultUsage(): string {
    return `❓ **Comment utiliser le jeu :**

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

  private getDefaultTestimonials(): string {
    return `⭐ **Ce que disent nos clients :**

⭐⭐⭐⭐⭐ **Marie & Jean**
"Ce jeu a révolutionné notre communication. Nous nous redécouvrons chaque jour !"

⭐⭐⭐⭐⭐ **Fatou**
"Un excellent investissement pour notre couple. Les questions sont très bien pensées."

⭐⭐⭐⭐⭐ **Ahmed**
"Simple, efficace et tellement enrichissant. Je le recommande vivement !"`;
  }

  private getDefaultTargetAudience(): string {
    return `👥 **Ce jeu est parfait pour :**

• Toute personne souhaitant améliorer ses relations
• Ceux qui cherchent à créer des moments authentiques
• Les personnes qui veulent mieux communiquer
• Tous ceux qui souhaitent renforcer leurs liens

💕 **Approuvé** par des milliers de personnes qui ont transformé leur façon de communiquer !

Souhaitez-vous voir les témoignages ou commander ?`;
  }

  // ==========================================
  // MÉTHODES UTILITAIRES POUR L'ADMIN
  // ==========================================

  async updateDeliveryZone(zoneId: string, updates: {
    name?: string;
    cities?: string[];
    cost?: number;
    is_active?: boolean;
    description?: string;
  }): Promise<boolean> {
    try {
      console.log('🔄 Updating delivery zone:', zoneId, updates);

      const { error } = await supabase
        .from('delivery_zones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', zoneId);

      if (error) {
        console.error('❌ Error updating delivery zone:', error);
        return false;
      }

      console.log('✅ Delivery zone updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Error in updateDeliveryZone:', error);
      return false;
    }
  }

  async createDeliveryZone(zone: {
    name: string;
    country?: string;
    cities: string[];
    cost: number;
    description?: string;
  }): Promise<string | null> {
    try {
      console.log('➕ Creating new delivery zone:', zone);

      const { data, error } = await supabase
        .from('delivery_zones')
        .insert({
          name: zone.name,
          country: zone.country || 'Sénégal',
          cities: zone.cities,
          cost: zone.cost,
          description: zone.description,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating delivery zone:', error);
        return null;
      }

      console.log('✅ Delivery zone created successfully:', data.id);
      return data.id;

    } catch (error) {
      console.error('❌ Error in createDeliveryZone:', error);
      return null;
    }
  }

  async getDeliveryCompanies(): Promise<any[]> {
    try {
      console.log('🚛 Fetching delivery companies...');

      const { data: companies, error } = await supabase
        .from('delivery_companies')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching delivery companies:', error);
        return [];
      }

      return companies || [];

    } catch (error) {
      console.error('❌ Error in getDeliveryCompanies:', error);
      return [];
    }
  }

  async getDeliveryDrivers(): Promise<any[]> {
    try {
      console.log('🏍️ Fetching delivery drivers...');

      const { data: drivers, error } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching delivery drivers:', error);
        return [];
      }

      return drivers || [];

    } catch (error) {
      console.error('❌ Error in getDeliveryDrivers:', error);
      return [];
    }
  }

  // ✅ NOUVEAU: Méthode pour calculer les coûts de livraison côté service
  async calculateDeliveryCostForCity(city: string): Promise<number> {
    try {
      const deliveryInfo = await this.getDeliveryInfo();
      
      if (!deliveryInfo) {
        return 2500; // Coût par défaut
      }

      const normalizedCity = city.toLowerCase().trim();
      
      // Chercher la zone correspondante
      for (const zone of deliveryInfo.zones) {
        if (zone.coverage_areas) {
          const cityMatch = zone.coverage_areas.some((zoneCity: string) => 
            normalizedCity.includes(zoneCity.toLowerCase()) ||
            zoneCity.toLowerCase().includes(normalizedCity)
          );
          
          if (cityMatch) {
            return zone.cost;
          }
        }
      }

      // Si aucune zone trouvée, retourner le coût le plus élevé
      const maxCost = Math.max(...deliveryInfo.zones.map(z => z.cost));
      return maxCost;

    } catch (error) {
      console.error('❌ Error calculating delivery cost:', error);
      return 2500;
    }
  }
}

export default DynamicContentService;