// src/lib/services/PhoneService.ts - VERSION COMPLÈTE CORRIGÉE
import { countries } from '@/lib/data/countries';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface FormattedPhone {
  formatted: string;
  international: string;
  local: string;
  country?: string;
  isValid: boolean;
  error?: string;
  suggestion?: string; // ✅ AJOUTÉ pour corriger l'erreur TypeScript
}

export class PhoneService {
  private static instance: PhoneService;
  
  // ✅ Patterns pour les pays supportés (depuis CountrySelector)
  private readonly countryPatterns: Record<string, {
    pattern: RegExp;
    format: (phone: string) => string;
    countryCode: string;
    minLength: number;
    maxLength: number;
  }> = {
    // Zone FCFA - Afrique de l'Ouest
    'SN': {
      pattern: /^(\+221|221|0)?[7][0-8]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+221',
      minLength: 9,
      maxLength: 12
    },
    'CI': {
      pattern: /^(\+225|225|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+225',
      minLength: 8,
      maxLength: 11
    },
    'BJ': {
      pattern: /^(\+229|229|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+229',
      minLength: 8,
      maxLength: 11
    },
    'BF': {
      pattern: /^(\+226|226|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+226',
      minLength: 8,
      maxLength: 11
    },
    'ML': {
      pattern: /^(\+223|223|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+223',
      minLength: 8,
      maxLength: 11
    },
    'NE': {
      pattern: /^(\+227|227|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+227',
      minLength: 8,
      maxLength: 11
    },
    'TG': {
      pattern: /^(\+228|228|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+228',
      minLength: 8,
      maxLength: 11
    },
    'GW': {
      pattern: /^(\+245|245|0)?[0-9]\d{6}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3'),
      countryCode: '+245',
      minLength: 7,
      maxLength: 10
    },

    // Zone FCFA - Afrique Centrale
    'CM': {
      pattern: /^(\+237|237|0)?[6-9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5'),
      countryCode: '+237',
      minLength: 9,
      maxLength: 12
    },
    'GA': {
      pattern: /^(\+241|241|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+241',
      minLength: 8,
      maxLength: 11
    },
    'CG': {
      pattern: /^(\+242|242|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+242',
      minLength: 8,
      maxLength: 11
    },
    'TD': {
      pattern: /^(\+235|235|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+235',
      minLength: 8,
      maxLength: 11
    },
    'CF': {
      pattern: /^(\+236|236|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      countryCode: '+236',
      minLength: 8,
      maxLength: 11
    },
    'GQ': {
      pattern: /^(\+240|240|0)?[0-9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+240',
      minLength: 9,
      maxLength: 12
    },

    // Afrique de l'Ouest (hors FCFA)
    'NG': {
      pattern: /^(\+234|234|0)?[7-9]\d{9}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'),
      countryCode: '+234',
      minLength: 10,
      maxLength: 13
    },
    'GH': {
      pattern: /^(\+233|233|0)?[2-5]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
      countryCode: '+233',
      minLength: 9,
      maxLength: 12
    },
    'LR': {
      pattern: /^(\+231|231|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+231',
      minLength: 8,
      maxLength: 11
    },
    'SL': {
      pattern: /^(\+232|232|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+232',
      minLength: 8,
      maxLength: 11
    },
    'GM': {
      pattern: /^(\+220|220|0)?[0-9]\d{6}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3'),
      countryCode: '+220',
      minLength: 7,
      maxLength: 10
    },
    'GN': {
      pattern: /^(\+224|224|0)?[0-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+224',
      minLength: 8,
      maxLength: 11
    },
    'CV': {
      pattern: /^(\+238|238|0)?[0-9]\d{6}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3'),
      countryCode: '+238',
      minLength: 7,
      maxLength: 10
    },

    // Afrique du Nord
    'MA': {
      pattern: /^(\+212|212|0)?[5-7]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5'),
      countryCode: '+212',
      minLength: 9,
      maxLength: 12
    },
    'DZ': {
      pattern: /^(\+213|213|0)?[5-7]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5'),
      countryCode: '+213',
      minLength: 9,
      maxLength: 12
    },
    'TN': {
      pattern: /^(\+216|216|0)?[2-9]\d{7}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+216',
      minLength: 8,
      maxLength: 11
    },
    'LY': {
      pattern: /^(\+218|218|0)?[9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
      countryCode: '+218',
      minLength: 9,
      maxLength: 12
    },
    'EG': {
      pattern: /^(\+20|20|0)?[1][0-9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3'),
      countryCode: '+20',
      minLength: 10,
      maxLength: 13
    },
    'SD': {
      pattern: /^(\+249|249|0)?[9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
      countryCode: '+249',
      minLength: 9,
      maxLength: 12
    },

    // Europe (pour les clients en voyage/expatriés)
    'FR': {
      pattern: /^(\+33|33|0)?[1-9]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5'),
      countryCode: '+33',
      minLength: 10,
      maxLength: 12
    },
    'DE': {
      pattern: /^(\+49|49|0)?[1-9]\d{9,11}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{4,6})/, '$1 $2 $3'),
      countryCode: '+49',
      minLength: 10,
      maxLength: 14
    },
    'IT': {
      pattern: /^(\+39|39|0)?[3]\d{8,9}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{3,4})/, '$1 $2 $3'),
      countryCode: '+39',
      minLength: 9,
      maxLength: 12
    },
    'GB': {
      pattern: /^(\+44|44|0)?[7]\d{9}$/,
      format: (phone: string) => phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+44',
      minLength: 10,
      maxLength: 13
    },
    'ES': {
      pattern: /^(\+34|34)?[6-7]\d{8}$/,
      format: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
      countryCode: '+34',
      minLength: 9,
      maxLength: 12
    }
  };

  private constructor() {}

  public static getInstance(): PhoneService {
    if (!this.instance) {
      this.instance = new PhoneService();
    }
    return this.instance;
  }

  // ✅ Détection automatique du pays
  public detectCountryFromPhone(phone: string): string | null {
    const cleanPhone = this.cleanPhoneNumber(phone);
    
    // Vérifier chaque pays supporté
    for (const [countryCode, config] of Object.entries(this.countryPatterns)) {
      if (config.pattern.test(cleanPhone)) {
        return countryCode;
      }
    }
    
    return null;
  }

  // ✅ Validation intelligente multi-pays
  public validatePhoneNumber(phone: string, preferredCountry: string = 'SN'): PhoneValidationResult {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        error: 'Numéro de téléphone requis'
      };
    }

    const cleanPhone = this.cleanPhoneNumber(phone);
    
    if (cleanPhone.length < 7) {
      return {
        isValid: false,
        error: 'Numéro trop court',
        suggestion: 'Entrez un numéro complet (exemple: +221 77 123 45 67)'
      };
    }

    // 1. Essayer d'abord avec le pays préféré
    if (this.countryPatterns[preferredCountry]) {
      const config = this.countryPatterns[preferredCountry];
      if (config.pattern.test(cleanPhone)) {
        return { isValid: true };
      }
    }

    // 2. Détecter automatiquement le pays
    const detectedCountry = this.detectCountryFromPhone(cleanPhone);
    if (detectedCountry) {
      return { isValid: true };
    }

    // 3. Pattern générique international pour autres pays
    const internationalPattern = /^(\+\d{1,3})?\d{7,15}$/;
    if (internationalPattern.test(cleanPhone)) {
      return { 
        isValid: true,
        suggestion: 'Numéro international accepté. Vérifiez que le format est correct.'
      };
    }

    return {
      isValid: false,
      error: 'Format de numéro non reconnu. Utilisez le format international (+XXX) ou local.',
      suggestion: 'Exemples : +221 77 123 45 67, +225 07 12 34 56 78, +33 6 12 34 56 78'
    };
  }

  // ✅ Formatage multi-pays
  public formatPhoneWithCountry(phone: string, countryCode?: string): FormattedPhone {
    const cleanPhone = this.cleanPhoneNumber(phone);
    
    // Détecter le pays si non spécifié
    if (!countryCode) {
      countryCode = this.detectCountryFromPhone(cleanPhone) || 'SN';
    }

    const config = this.countryPatterns[countryCode];
    
    if (!config) {
      // Formatage générique pour pays non supportés
      return this.formatGenericInternational(cleanPhone);
    }

    try {
      // Extraire le numéro local (sans indicatif pays)
      const localNumber = this.extractLocalNumber(cleanPhone, config.countryCode);
      
      // Vérifier la validité
      const fullNumber = config.countryCode.replace('+', '') + localNumber;
      if (!config.pattern.test(fullNumber)) {
        return {
          formatted: phone,
          international: phone,
          local: phone,
          country: countryCode,
          isValid: false,
          error: `Format invalide pour ${this.getCountryName(countryCode)}`
        };
      }

      // Formater selon les règles du pays
      const formatted = config.format(localNumber);
      const international = `${config.countryCode} ${formatted}`;

      return {
        formatted: formatted,
        international: international,
        local: localNumber,
        country: countryCode,
        isValid: true
      };

    } catch (error) {
      return {
        formatted: phone,
        international: phone,
        local: phone,
        country: countryCode,
        isValid: false,
        error: 'Erreur de formatage'
      };
    }
  }

  // ✅ Formatage générique international
  private formatGenericInternational(phone: string): FormattedPhone {
    const cleanPhone = this.cleanPhoneNumber(phone);
    
    // Si le numéro commence par +, on l'accepte tel quel
    if (phone.startsWith('+')) {
      return {
        formatted: phone,
        international: phone,
        local: phone.substring(phone.indexOf(' ') + 1) || phone,
        isValid: true,
        suggestion: 'Format international accepté'
      };
    }

    // Sinon, essayer de deviner le format
    if (cleanPhone.length >= 10) {
      return {
        formatted: cleanPhone,
        international: '+' + cleanPhone,
        local: cleanPhone,
        isValid: true,
        suggestion: 'Format international accepté'
      };
    }

    return {
      formatted: phone,
      international: phone,
      local: phone,
      isValid: false,
      error: 'Format non reconnu'
    };
  }

  // ✅ Extraire numéro local
  private extractLocalNumber(phone: string, countryCode: string): string {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const codeWithoutPlus = countryCode.replace('+', '');
    
    // Supprimer l'indicatif pays s'il existe
    if (cleanPhone.startsWith(codeWithoutPlus)) {
      return cleanPhone.substring(codeWithoutPlus.length);
    }
    
    if (cleanPhone.startsWith(countryCode)) {
      return cleanPhone.substring(countryCode.length);
    }
    
    // Pour la France, gérer le 0 initial
    if (countryCode === '+33' && cleanPhone.startsWith('0')) {
      return cleanPhone.substring(1);
    }
    
    return cleanPhone;
  }

  // ✅ Nom du pays
  private getCountryName(countryCode: string): string {
    const country = countries.find(c => c.code === countryCode);
    return country?.name || countryCode;
  }

  // ✅ Nettoyage du numéro
  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  // ✅ Liste des pays supportés
  public getSupportedCountries(): Array<{code: string, name: string, example: string}> {
    return Object.entries(this.countryPatterns).map(([code, config]) => ({
      code,
      name: this.getCountryName(code),
      example: `${config.countryCode} XX XX XX XX`
    }));
  }

  // ✅ Validation avec suggestions
  public validateWithSuggestions(phone: string, countryCode?: string): {
    isValid: boolean;
    formatted?: FormattedPhone;
    suggestions: string[];
    error?: string;
  } {
    const suggestions: string[] = [];
    
    // Validation de base
    const validation = this.validatePhoneNumber(phone, countryCode);
    
    if (validation.isValid) {
      const formatted = this.formatPhoneWithCountry(phone, countryCode);
      return {
        isValid: true,
        formatted,
        suggestions: []
      };
    }

    // Générer des suggestions
    if (phone.length > 0) {
      const cleanPhone = this.cleanPhoneNumber(phone);
      
      // Suggestions basées sur la longueur
      if (cleanPhone.length < 8) {
        suggestions.push('Le numéro semble trop court. Vérifiez qu\'il est complet.');
      }
      
      // Suggestions de format par pays populaires
      suggestions.push(
        'Sénégal: +221 77 123 45 67',
        'Côte d\'Ivoire: +225 07 12 34 56',
        'France: +33 6 12 34 56 78',
        'Format international: +XXX XXXXXXXXX'
      );
    }

    return {
      isValid: false,
      suggestions,
      error: validation.error
    };
  }
}