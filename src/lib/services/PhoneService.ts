// src/lib/services/PhoneService.ts

interface CountryCode {
    code: string;
    prefix: string;
    pattern: RegExp;
    format: string;
  }
  
  export class PhoneService {
    private static instance: PhoneService;
    
    // Définition des codes pays pour l'Afrique de l'Ouest
    private readonly countryCodes: Record<string, CountryCode> = {
      'SN': { 
        code: 'SN',
        prefix: '+221',
        pattern: /^(?:7[0-8])\d{7}$/,
        format: 'XX XXX XX XX'
      },
      'CI': {
        code: 'CI',
        prefix: '+225',
        pattern: /^(?:0[1-8]|[457])\d{7}$/,
        format: 'XX XX XX XX XX'
      },
      'BF': {
        code: 'BF',
        prefix: '+226',
        pattern: /^(?:[567])\d{7}$/,
        format: 'XX XX XX XX'
      },
      'ML': {
        code: 'ML',
        prefix: '+223',
        pattern: /^(?:[67])\d{7}$/,
        format: 'XX XX XX XX'
      },
      'GN': {
        code: 'GN',
        prefix: '+224',
        pattern: /^(?:[6])\d{8}$/,
        format: 'XXX XX XX XX'
      }
    };
  
    private constructor() {}
  
    public static getInstance(): PhoneService {
      if (!PhoneService.instance) {
        PhoneService.instance = new PhoneService();
      }
      return PhoneService.instance;
    }
  
    private cleanPhoneNumber(phone: string): string {
      return phone.replace(/\s+/g, '').replace(/^0+/, '');
    }
  
    public formatPhoneWithCountry(
      phone: string,
      countryCode: string
    ): {
      formatted: string;
      international: string;
      isValid: boolean;
      error?: string;
    } {
      try {
        const country = this.countryCodes[countryCode];
        if (!country) {
          return {
            formatted: phone,
            international: phone,
            isValid: false,
            error: 'Pays non supporté'
          };
        }
  
        const cleaned = this.cleanPhoneNumber(phone);
  
        // Détecter si le numéro inclut déjà l'indicatif
        const hasPrefix = cleaned.startsWith(country.prefix.replace('+', ''));
        const numberWithoutPrefix = hasPrefix 
          ? cleaned.slice(country.prefix.length - 1)
          : cleaned;
  
        // Valider le format selon le pays
        if (!country.pattern.test(numberWithoutPrefix)) {
          return {
            formatted: phone,
            international: phone,
            isValid: false,
            error: `Format invalide pour ${countryCode}. Format attendu: ${country.format}`
          };
        }
  
        // Formater pour l'affichage
        const formatted = numberWithoutPrefix.replace(/(\d{2})/g, '$1 ').trim();
        
        // Format international
        const international = `${country.prefix}${numberWithoutPrefix}`;
  
        return {
          formatted,
          international,
          isValid: true
        };
  
      } catch (error) {
        console.error('Error formatting phone number:', error);
        return {
          formatted: phone,
          international: phone,
          isValid: false,
          error: 'Erreur de formatage'
        };
      }
    }
  
    public validatePhoneNumber(
      phone: string,
      countryCode: string
    ): {
      isValid: boolean;
      error?: string;
    } {
      const result = this.formatPhoneWithCountry(phone, countryCode);
      return {
        isValid: result.isValid,
        error: result.error
      };
    }
  
    public getHelpText(countryCode: string): string {
      const country = this.countryCodes[countryCode];
      if (!country) return '';
  
      return `Format: ${country.format} (${country.prefix})`;
    }
  
    public isValidCountryCode(countryCode: string): boolean {
      return countryCode in this.countryCodes;
    }
  
    public getCountryPrefix(countryCode: string): string | null {
      return this.countryCodes[countryCode]?.prefix || null;
    }
  }