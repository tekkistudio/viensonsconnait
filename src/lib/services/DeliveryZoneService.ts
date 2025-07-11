// src/lib/services/DeliveryZoneService.ts
import { supabase } from '@/lib/supabase';

interface DeliveryZone {
  id: string;
  name: string;
  cities: string[];
  cost: number;
  free_delivery_threshold?: number;
  is_active: boolean;
}

interface CityValidationResult {
  isDeliverable: boolean;
  deliveryCost: number;
  zoneName?: string;
  isFreeDelivery: boolean;
  message: string;
  suggestMobileApp?: boolean;
}

export class DeliveryZoneService {
  private static instance: DeliveryZoneService;
  private zonesCache: DeliveryZone[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  public static getInstance(): DeliveryZoneService {
    if (!this.instance) {
      this.instance = new DeliveryZoneService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE : Valider une ville (CORRIGÉE)
    public async validateCity(cityName: string, orderAmount: number = 0): Promise<CityValidationResult> {
    try {
        await this.ensureCache();
        
        const normalizedCity = this.normalizeCityName(cityName);
        console.log('🏢 Validating city:', { original: cityName, normalized: normalizedCity });

        // Chercher dans les zones de livraison
        for (const zone of this.zonesCache) {
        if (!zone.is_active) continue;

        const cityFound = zone.cities.some(city => 
            this.normalizeCityName(city) === normalizedCity
        );

        if (cityFound) {
            // ✅ CORRECTION TypeScript : Gestion explicite du booléen
            const hasThreshold = zone.free_delivery_threshold !== undefined && zone.free_delivery_threshold !== null;
            const meetsThreshold = hasThreshold ? orderAmount >= zone.free_delivery_threshold! : false;
            const isFreeDelivery = zone.cost === 0 || meetsThreshold;

            return {
            isDeliverable: true,
            deliveryCost: isFreeDelivery ? 0 : zone.cost,
            zoneName: zone.name,
            isFreeDelivery: isFreeDelivery, 
            message: isFreeDelivery 
                ? `🛵 La livraison est gratuite à ${cityName}` 
                : `📦 La livraison à ${cityName} est à ${zone.cost.toLocaleString()} FCFA`
            };
        }
        }

        // Ville non trouvée dans les zones de livraison
        console.log('❌ City not found in delivery zones:', normalizedCity);
        
        return {
        isDeliverable: false,
        deliveryCost: 0,
        isFreeDelivery: false, // ✅ Explicitement boolean
        message: `Je suis navrée 😔 Nous ne livrons maleureusement pas encore à ${cityName}`,
        suggestMobileApp: true
        };

    } catch (error) {
        console.error('❌ Error validating city:', error);
        
        // Fallback : Si Dakar, gratuit, sinon payant
        const isDakar = this.normalizeCityName(cityName) === 'dakar';
        
        return {
        isDeliverable: true,
        deliveryCost: isDakar ? 0 : 2500,
        isFreeDelivery: isDakar, // ✅ Explicitement boolean
        message: isDakar 
            ? `🛵 La livraison est gratuite à Dakar` 
            : `📦 La livraison à ${cityName} est à **2,500 FCFA**`
        };
    }
    }

  // ✅ MÉTHODE : Obtenir toutes les villes de livraison
  public async getDeliverableCities(): Promise<string[]> {
    await this.ensureCache();
    
    const allCities: string[] = [];
    this.zonesCache.forEach(zone => {
      if (zone.is_active) {
        allCities.push(...zone.cities);
      }
    });
    
    return [...new Set(allCities)].sort();
  }

  // ✅ MÉTHODE : Vérifier si une ville est dans la zone gratuite
  public async isFreeDeliveryCity(cityName: string): Promise<boolean> {
    const result = await this.validateCity(cityName, 0);
    return result.isFreeDelivery;
  }

  // ✅ MÉTHODE PRIVÉE : Normaliser les noms de ville
  private normalizeCityName(cityName: string): string {
    return cityName
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/\s+/g, ' ');
  }

  // ✅ MÉTHODE PRIVÉE : Assurer le cache
  private async ensureCache(): Promise<void> {
    const now = Date.now();
    
    if (this.zonesCache.length === 0 || (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
      await this.refreshCache();
    }
  }

  // ✅ MÉTHODE PRIVÉE : Rafraîchir le cache
  private async refreshCache(): Promise<void> {
    try {
      console.log('🔄 Refreshing delivery zones cache...');
      
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Supabase error:', error);
        // Utiliser les zones par défaut
        this.zonesCache = this.getDefaultZones();
        this.lastCacheUpdate = Date.now();
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No delivery zones found, using defaults');
        this.zonesCache = this.getDefaultZones();
      } else {
        this.zonesCache = data.map(zone => ({
          id: zone.id,
          name: zone.name,
          cities: Array.isArray(zone.cities) ? zone.cities : [],
          cost: zone.cost || 0,
          free_delivery_threshold: zone.free_delivery_threshold,
          is_active: zone.is_active
        }));
      }

      this.lastCacheUpdate = Date.now();
      console.log(`✅ Cache refreshed: ${this.zonesCache.length} zones loaded`);
      
    } catch (error) {
      console.error('❌ Error refreshing cache:', error);
      this.zonesCache = this.getDefaultZones();
      this.lastCacheUpdate = Date.now();
    }
  }

  // ✅ MÉTHODE PRIVÉE : Zones par défaut
  private getDefaultZones(): DeliveryZone[] {
    return [
      {
        id: 'dakar-free',
        name: 'Dakar - Livraison gratuite',
        cities: ['dakar', 'Dakar', 'DAKAR'],
        cost: 0,
        is_active: true
      },
      {
        id: 'senegal-paid',
        name: 'Sénégal - Livraison payante',
        cities: [
          'thies', 'Thiès', 'kaolack', 'Kaolack', 'saint-louis', 'Saint-Louis', 'Saint-louis', 'ziguinchor', 'Ziguinchor', 'diourbel', 'Diourbel', 
          'louga', 'Louga', 'fatick', 'Fatick', 'kolda', 'Kolda', 'matam', 'Matam', 'kaffrine', 'Kaffrine', 'sedhiou', 'Sedhiou', 
          'kedougou', 'Kedougou', 'tambacounda', 'Tambacounda', 'rufisque', 'Rufisque', 'mbour', 'Mbour', 'joal', 'Joal', 
          'saly', 'Saly', 'somone', 'Somone', 'tivaouane', 'Tivaoune', 'mekhe', 'Mekhe', 'khombole', 'Khombole', 
        ],
        cost: 2500,
        free_delivery_threshold: 50000,
        is_active: true
      }
    ];
  }

  // ✅ MÉTHODE : Nettoyer le cache (pour tests)
  public clearCache(): void {
    this.zonesCache = [];
    this.lastCacheUpdate = 0;
  }
}