// src/lib/services/PhoneService.ts 
import type { 
  PhoneValidationResult, 
  FormattedPhone 
} from '@/types/chat';

export class PhoneService {
  private static instance: PhoneService;

  // ✅ PATTERNS ÉTENDUS: Support pour tous les pays du CountrySelector
  private readonly phonePatterns: Record<string, RegExp> = {
    // Afrique de l'Ouest - Zone FCFA
    'SN': /^(\+221|221|0)?([7][0-9]{8}|[3][0-9]{7})$/, // Sénégal
    'CI': /^(\+225|225|0)?([0-9]{8,10})$/, // Côte d'Ivoire
    'BJ': /^(\+229|229)?([0-9]{8})$/, // Bénin
    'BF': /^(\+226|226)?([0-9]{8})$/, // Burkina Faso
    'ML': /^(\+223|223)?([0-9]{8})$/, // Mali
    'NE': /^(\+227|227)?([0-9]{8})$/, // Niger
    'TG': /^(\+228|228)?([0-9]{8})$/, // Togo
    'GW': /^(\+245|245)?([0-9]{7})$/, // Guinée-Bissau

    // Afrique Centrale - Zone FCFA
    'CM': /^(\+237|237)?([0-9]{8,9})$/, // Cameroun
    'GA': /^(\+241|241)?([0-9]{7,8})$/, // Gabon
    'CG': /^(\+242|242)?([0-9]{7,9})$/, // Congo
    'TD': /^(\+235|235)?([0-9]{8})$/, // Tchad
    'CF': /^(\+236|236)?([0-9]{8})$/, // République Centrafricaine
    'GQ': /^(\+240|240)?([0-9]{9})$/, // Guinée Équatoriale

    // Afrique de l'Ouest (hors FCFA)
    'NG': /^(\+234|234|0)?([0-9]{10})$/, // Nigeria
    'GH': /^(\+233|233|0)?([0-9]{9})$/, // Ghana
    'LR': /^(\+231|231)?([0-9]{8})$/, // Liberia
    'SL': /^(\+232|232)?([0-9]{8})$/, // Sierra Leone
    'GM': /^(\+220|220)?([0-9]{7})$/, // Gambie
    'GN': /^(\+224|224)?([0-9]{8,9})$/, // Guinée
    'CV': /^(\+238|238)?([0-9]{7})$/, // Cap-Vert

    // Afrique du Nord
    'MA': /^(\+212|212|0)?([0-9]{9})$/, // Maroc
    'DZ': /^(\+213|213|0)?([0-9]{9})$/, // Algérie
    'TN': /^(\+216|216)?([0-9]{8})$/, // Tunisie
    'LY': /^(\+218|218)?([0-9]{9})$/, // Libye
    'EG': /^(\+20|20|0)?([0-9]{10})$/, // Égypte
    'SD': /^(\+249|249)?([0-9]{9})$/, // Soudan

    // Europe
    'FR': /^(\+33|33|0)?([0-9]{9})$/, // France
    'DE': /^(\+49|49|0)?([0-9]{10,11})$/, // Allemagne
    'IT': /^(\+39|39)?([0-9]{9,10})$/, // Italie
    'GB': /^(\+44|44|0)?([0-9]{10})$/, // Royaume-Uni
    'ES': /^(\+34|34)?([0-9]{9})$/, // Espagne
  };

  // ✅ INDICATIFS PAYS ÉTENDUS
  private readonly countryCodes: Record<string, string> = {
    // Afrique de l'Ouest - Zone FCFA
    'SN': '+221', 'CI': '+225', 'BJ': '+229', 'BF': '+226', 
    'ML': '+223', 'NE': '+227', 'TG': '+228', 'GW': '+245',
    
    // Afrique Centrale - Zone FCFA
    'CM': '+237', 'GA': '+241', 'CG': '+242', 'TD': '+235', 
    'CF': '+236', 'GQ': '+240',
    
    // Afrique de l'Ouest (hors FCFA)
    'NG': '+234', 'GH': '+233', 'LR': '+231', 'SL': '+232', 
    'GM': '+220', 'GN': '+224', 'CV': '+238',
    
    // Afrique du Nord
    'MA': '+212', 'DZ': '+213', 'TN': '+216', 'LY': '+218', 
    'EG': '+20', 'SD': '+249',
    
    // Europe
    'FR': '+33', 'DE': '+49', 'IT': '+39', 'GB': '+44', 'ES': '+34'
  };

  private constructor() {}

  public static getInstance(): PhoneService {
    if (!PhoneService.instance) {
      PhoneService.instance = new PhoneService();
    }
    return PhoneService.instance;
  }

  // ✅ MÉTHODE PRINCIPALE: Validation avec détection automatique du pays
  public validatePhoneNumber(phone: string, countryHint?: string): PhoneValidationResult {
    if (!phone || phone.trim().length === 0) {
      return {
        isValid: false,
        error: 'Numéro de téléphone requis'
      };
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    // 1. Essayer d'abord avec le pays suggéré
    if (countryHint && this.phonePatterns[countryHint]) {
      const result = this.validateForCountry(cleanPhone, countryHint);
      if (result.isValid) {
        return result;
      }
    }

    // 2. Détection automatique du pays par l'indicatif
    const detectedCountry = this.detectCountryFromPhone(cleanPhone);
    if (detectedCountry) {
      const result = this.validateForCountry(cleanPhone, detectedCountry);
      if (result.isValid) {
        return result;
      }
    }

    // 3. Essayer tous les patterns (fallback)
    for (const [country, pattern] of Object.entries(this.phonePatterns)) {
      if (pattern.test(cleanPhone)) {
        return {
          isValid: true,
          error: undefined
        };
      }
    }

    return {
      isValid: false,
      error: 'Format de numéro non reconnu. Utilisez le format international (+XXX XXXXXXXXX)'
    };
  }

  // ✅ VALIDATION SPÉCIFIQUE PAR PAYS
  private validateForCountry(phone: string, country: string): PhoneValidationResult {
    const pattern = this.phonePatterns[country];
    if (!pattern) {
      return {
        isValid: false,
        error: `Pays non supporté: ${country}`
      };
    }

    if (pattern.test(phone)) {
      return {
        isValid: true,
        error: undefined
      };
    }

    const countryCode = this.countryCodes[country];
    return {
      isValid: false,
      error: `Format invalide pour ${country}. Exemple: ${countryCode} XX XX XX XX`
    };
  }

  // ✅ DÉTECTION AUTOMATIQUE DU PAYS
  private detectCountryFromPhone(phone: string): string | null {
    // Essayer les indicatifs les plus longs d'abord
    const sortedCodes = Object.entries(this.countryCodes)
      .sort(([,a], [,b]) => b.length - a.length);

    for (const [country, code] of sortedCodes) {
      const numericCode = code.replace('+', '');
      if (phone.startsWith('+' + numericCode) || phone.startsWith(numericCode)) {
        return country;
      }
    }

    // Pour le Sénégal, détecter les numéros locaux commençant par 7 ou 3
    if (/^[73]/.test(phone) && phone.length >= 8) {
      return 'SN';
    }

    return null;
  }

  // ✅ FORMATAGE AVEC DÉTECTION DE PAYS
  public formatPhoneWithCountry(phone: string, countryHint?: string): FormattedPhone {
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Détection du pays
    let detectedCountry = countryHint || this.detectCountryFromPhone(cleanPhone);
    
    if (!detectedCountry) {
      return {
        formatted: phone,
        international: phone,
        local: phone,
        isValid: false,
        error: 'Pays non détecté'
      };
    }

    return this.formatForSpecificCountry(cleanPhone, detectedCountry);
  }

  // ✅ FORMATAGE SPÉCIFIQUE PAR PAYS
  private formatForSpecificCountry(phone: string, country: string): FormattedPhone {
    let cleaned = phone;
    const countryCode = this.countryCodes[country];

    if (!countryCode) {
      return {
        formatted: phone,
        international: phone,
        local: phone,
        isValid: false,
        error: 'Pays non supporté'
      };
    }

    // Nettoyer le numéro selon le pays
    const numericCode = countryCode.replace('+', '');
    
    // Supprimer l'indicatif pays s'il est présent
    if (cleaned.startsWith('+' + numericCode)) {
      cleaned = cleaned.substring(numericCode.length + 1);
    } else if (cleaned.startsWith(numericCode)) {
      cleaned = cleaned.substring(numericCode.length);
    }

    // Formatage spécifique par pays
    switch (country) {
      case 'SN': // Sénégal
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`,
          international: `+221${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'SN'
        };

      case 'CI': // Côte d'Ivoire
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`,
          international: `+225${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'CI'
        };

      case 'BJ': // Bénin
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+229${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'BJ'
        };

      case 'BF': // Burkina Faso
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+226${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'BF'
        };

      case 'ML': // Mali
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+223${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'ML'
        };

      case 'NE': // Niger
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+227${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'NE'
        };

      case 'TG': // Togo
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+228${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'TG'
        };

      case 'CM': // Cameroun
        return {
          formatted: `${cleaned.substring(0, 1)} ${cleaned.substring(1, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`,
          international: `+237${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'CM'
        };

      case 'GA': // Gabon
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`,
          international: `+241${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'GA'
        };

      case 'NG': // Nigeria
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`,
          international: `+234${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'NG'
        };

      case 'GH': // Ghana
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`,
          international: `+233${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'GH'
        };

      case 'MA': // Maroc
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 1)} ${cleaned.substring(1, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`,
          international: `+212${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'MA'
        };

      case 'DZ': // Algérie
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 1)} ${cleaned.substring(1, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`,
          international: `+213${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'DZ'
        };

      case 'TN': // Tunisie
        return {
          formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`,
          international: `+216${cleaned}`,
          local: cleaned,
          isValid: true,
          country: 'TN'
        };

      case 'FR': // France
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        return {
          formatted: `${cleaned.substring(0, 1)} ${cleaned.substring(1, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`,
          international: `+33${cleaned}`,
          local: `0${cleaned}`,
          isValid: true,
          country: 'FR'
        };

      default:
        // Format générique pour les autres pays
        return {
          formatted: cleaned,
          international: `${countryCode}${cleaned}`,
          local: cleaned,
          isValid: true,
          country: country
        };
    }
  }

  // ✅ MÉTHODES UTILITAIRES
  public getSupportedCountries(): string[] {
    return Object.keys(this.phonePatterns);
  }

  public getCountryCode(country: string): string | undefined {
    return this.countryCodes[country];
  }

  public isValidPhoneFormat(phone: string): boolean {
    return this.validatePhoneNumber(phone).isValid;
  }

  // ✅ MÉTHODE POUR FORMATER UN NUMÉRO SIMPLE
  public formatPhone(phone: string): string {
    const result = this.formatPhoneWithCountry(phone);
    return result.isValid ? result.formatted : phone;
  }

  // ✅ MÉTHODE POUR OBTENIR LE FORMAT INTERNATIONAL
  public getInternationalFormat(phone: string): string {
    const result = this.formatPhoneWithCountry(phone);
    return result.isValid ? result.international : phone;
  }
}