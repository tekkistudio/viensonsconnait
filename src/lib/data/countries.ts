// src/lib/data/countries.ts
export interface Country {
    code: string;
    name: string;
    flag: string;
    currency: {
      code: string;
      symbol: string;
      rate: number;
    };
  }
  
  export const countries: Country[] = [
    // Afrique de l'Ouest - Zone FCFA
    {
      code: 'SN',
      name: 'Sénégal',
      flag: '🇸🇳',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'CI',
      name: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'BJ',
      name: 'Bénin',
      flag: '🇧🇯',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'BF',
      name: 'Burkina Faso',
      flag: '🇧🇫',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'ML',
      name: 'Mali',
      flag: '🇲🇱',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'NE',
      name: 'Niger',
      flag: '🇳🇪',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'TG',
      name: 'Togo',
      flag: '🇹🇬',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'GW',
      name: 'Guinée-Bissau',
      flag: '🇬🇼',
      currency: { code: 'XOF', symbol: 'FCFA', rate: 1 }
    },
  
    // Afrique Centrale - Zone FCFA
    {
      code: 'CM',
      name: 'Cameroun',
      flag: '🇨🇲',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'GA',
      name: 'Gabon',
      flag: '🇬🇦',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'CG',
      name: 'Congo',
      flag: '🇨🇬',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'TD',
      name: 'Tchad',
      flag: '🇹🇩',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'CF',
      name: 'République centrafricaine',
      flag: '🇨🇫',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
    {
      code: 'GQ',
      name: 'Guinée équatoriale',
      flag: '🇬🇶',
      currency: { code: 'XAF', symbol: 'FCFA', rate: 1 }
    },
 
    // Afrique du Nord (hors zone FCFA)
  {
    code: 'LY',
    name: 'Libye',
    flag: '🇱🇾',
    currency: { code: 'LYD', symbol: 'LD', rate: 128.0 }
  },
  {
    code: 'MA',
    name: 'Maroc',
    flag: '🇲🇦',
    currency: { code: 'MAD', symbol: 'DH', rate: 60.50 }
  },
  {
    code: 'TN',
    name: 'Tunisie',
    flag: '🇹🇳',
    currency: { code: 'TND', symbol: 'DT', rate: 193.45 }
  },
  {
    code: 'DZ',
    name: 'Algérie',
    flag: '🇩🇿',
    currency: { code: 'DZD', symbol: 'DA', rate: 44.75 }
  },
  {
    code: 'EG',
    name: 'Égypte',
    flag: '🇪🇬',
    currency: { code: 'EGP', symbol: 'E£', rate: 38.5 }
  },
  {
    code: 'SD',
    name: 'Soudan',
    flag: '🇸🇩',
    currency: { code: 'SDG', symbol: 'SDG', rate: 10.0 }
  },

  // Afrique de l'Est
  {
    code: 'ET',
    name: 'Éthiopie',
    flag: '🇪🇹',
    currency: { code: 'ETB', symbol: 'Br', rate: 11.5 }
  },
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: { code: 'KES', symbol: 'KSh', rate: 5.4 }
  },
  {
    code: 'UG',
    name: 'Ouganda',
    flag: '🇺🇬',
    currency: { code: 'UGX', symbol: 'USh', rate: 0.16 }
  },
  {
    code: 'TZ',
    name: 'Tanzanie',
    flag: '🇹🇿',
    currency: { code: 'TZS', symbol: 'TSh', rate: 0.25 }
  },
  {
    code: 'RW',
    name: 'Rwanda',
    flag: '🇷🇼',
    currency: { code: 'RWF', symbol: 'RF', rate: 0.6 }
  },
  {
    code: 'BI',
    name: 'Burundi',
    flag: '🇧🇮',
    currency: { code: 'BIF', symbol: 'FBu', rate: 0.3 }
  },
  {
    code: 'SO',
    name: 'Somalie',
    flag: '🇸🇴',
    currency: { code: 'SOS', symbol: 'SSh', rate: 1.1 }
  },
  {
    code: 'DJ',
    name: 'Djibouti',
    flag: '🇩🇯',
    currency: { code: 'DJF', symbol: 'Fdj', rate: 3.6 }
  },
  {
    code: 'ER',
    name: 'Érythrée',
    flag: '🇪🇷',
    currency: { code: 'ERN', symbol: 'Nkf', rate: 40.0 }
  },

  // Afrique australe
  {
    code: 'ZA',
    name: 'Afrique du Sud',
    flag: '🇿🇦',
    currency: { code: 'ZAR', symbol: 'R', rate: 35.0 }
  },
  {
    code: 'ZW',
    name: 'Zimbabwe',
    flag: '🇿🇼',
    currency: { code: 'ZWL', symbol: '$', rate: 1.5 }
  },
  {
    code: 'NA',
    name: 'Namibie',
    flag: '🇳🇦',
    currency: { code: 'NAD', symbol: '$', rate: 35.0 }
  },
  {
    code: 'BW',
    name: 'Botswana',
    flag: '🇧🇼',
    currency: { code: 'BWP', symbol: 'P', rate: 45.0 }
  },
  {
    code: 'MZ',
    name: 'Mozambique',
    flag: '🇲🇿',
    currency: { code: 'MZN', symbol: 'MT', rate: 9.5 }
  },
  {
    code: 'ZM',
    name: 'Zambie',
    flag: '🇿🇲',
    currency: { code: 'ZMW', symbol: 'ZK', rate: 35.0 }
  },
  {
    code: 'MW',
    name: 'Malawi',
    flag: '🇲🇼',
    currency: { code: 'MWK', symbol: 'MK', rate: 0.75 }
  },
  {
    code: 'LS',
    name: 'Lesotho',
    flag: '🇱🇸',
    currency: { code: 'LSL', symbol: 'L', rate: 35.0 }
  },
  {
    code: 'SZ',
    name: 'Eswatini',
    flag: '🇸🇿',
    currency: { code: 'SZL', symbol: 'E', rate: 35.0 }
  },
  {
    code: 'ST',
    name: 'São Tomé-et-Principe',
    flag: '🇸🇹',
    currency: { code: 'STN', symbol: 'Db', rate: 28.0 }
  },
  {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    currency: { code: 'AOA', symbol: 'Kz', rate: 1.2 }
  },

  // Afrique de l'Ouest (hors zone FCFA)
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency: { code: 'NGN', symbol: '₦', rate: 1.3 }
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currency: { code: 'GHS', symbol: '₵', rate: 52.5 }
  },
  {
    code: 'LR',
    name: 'Liberia',
    flag: '🇱🇷',
    currency: { code: 'LRD', symbol: '$', rate: 3.9 }
  },
  {
    code: 'SL',
    name: 'Sierra Leone',
    flag: '🇸🇱',
    currency: { code: 'SLL', symbol: 'Le', rate: 0.055 }
  },
  {
    code: 'GM',
    name: 'Gambie',
    flag: '🇬🇲',
    currency: { code: 'GMD', symbol: 'D', rate: 12.5 }
  },
  {
    code: 'GN',
    name: 'Guinée',
    flag: '🇬🇳',
    currency: { code: 'GNF', symbol: 'FG', rate: 0.064 }
  },
  {
    code: 'CV',
    name: 'Cap-Vert',
    flag: '🇨🇻',
    currency: { code: 'CVE', symbol: '$', rate: 6.5 }
  },

  // Autres régions
  {
    code: 'MG',
    name: 'Madagascar',
    flag: '🇲🇬',
    currency: { code: 'MGA', symbol: 'Ar', rate: 0.15 }
  },
  {
    code: 'MU',
    name: 'Maurice',
    flag: '🇲🇺',
    currency: { code: 'MUR', symbol: '₨', rate: 13.5 }
  },
  {
    code: 'SC',
    name: 'Seychelles',
    flag: '🇸🇨',
    currency: { code: 'SCR', symbol: '₨', rate: 45.0 }
  },
  {
    code: 'KM',
    name: 'Comores',
    flag: '🇰🇲',
    currency: { code: 'KMF', symbol: 'CF', rate: 2.0 }
  },
  
    // Europe - Zone Euro
    {
      code: 'FR',
      name: 'France',
      flag: '🇫🇷',
      currency: { code: 'EUR', symbol: '€', rate: 655.957 }
    },
    {
      code: 'DE',
      name: 'Allemagne',
      flag: '🇩🇪',
      currency: { code: 'EUR', symbol: '€', rate: 655.957 }
    },
    {
      code: 'IT',
      name: 'Italie',
      flag: '🇮🇹',
      currency: { code: 'EUR', symbol: '€', rate: 655.957 }
    },

    // Europe - Zone Hors Euro
    {
      code: 'NO',
      name: 'Norvège',
      flag: '🇳🇴',
      currency: { code: 'NOK', symbol: 'kr', rate: 60.0 }
    },
    {
      code: 'SE',
      name: 'Suède',
      flag: '🇸🇪',
      currency: { code: 'SEK', symbol: 'kr', rate: 62.0 }
    },
    {
      code: 'GB',
      name: 'Royaume-Uni',
      flag: '🇬🇧',
      currency: { code: 'GBP', symbol: '£', rate: 755.0 }
    },
    {
      code: 'DK',
      name: 'Danemark',
      flag: '🇩🇰',
      currency: { code: 'DKK', symbol: 'kr', rate: 88.0 }
    },
  
    // Amérique du Nord
    {
      code: 'US',
      name: 'États-Unis',
      flag: '🇺🇸',
      currency: { code: 'USD', symbol: '$', rate: 600.0 }
    },
    {
      code: 'CA',
      name: 'Canada',
      flag: '🇨🇦',
      currency: { code: 'CAD', symbol: '$', rate: 445.0 }
    },
    {
      code: 'MX',
      name: 'Mexique',
      flag: '🇲🇽',
      currency: { code: 'MXN', symbol: '$', rate: 35.0 }
    },
  
    // Asie
    {
      code: 'CN',
      name: 'Chine',
      flag: '🇨🇳',
      currency: { code: 'CNY', symbol: '¥', rate: 83.5 }
    },
    {
      code: 'KR',
      name: 'Corée du Sud',
      flag: '🇰🇷',
      currency: { code: 'KRW', symbol: '₩', rate: 0.5 }
    },
    {
      code: 'PK',
      name: 'Pakistan',
      flag: '🇵🇰',
      currency: { code: 'PKR', symbol: '₨', rate: 3.75 }
    },
    {
      code: 'BD',
      name: 'Bangladesh',
      flag: '🇧🇩',
      currency: { code: 'BDT', symbol: '৳', rate: 6.5 }
    },
    {
      code: 'VN',
      name: 'Vietnam',
      flag: '🇻🇳',
      currency: { code: 'VND', symbol: '₫', rate: 0.03 }
    },
    {
      code: 'PH',
      name: 'Philippines',
      flag: '🇵🇭',
      currency: { code: 'PHP', symbol: '₱', rate: 12.0 }
    },
    {
      code: 'TH',
      name: 'Thaïlande',
      flag: '🇹🇭',
      currency: { code: 'THB', symbol: '฿', rate: 17.5 }
    },
    {
      code: 'JP',
      name: 'Japon',
      flag: '🇯🇵',
      currency: { code: 'JPY', symbol: '¥', rate: 4.1 }
    },
    {
      code: 'IN',
      name: 'Inde',
      flag: '🇮🇳',
      currency: { code: 'INR', symbol: '₹', rate: 7.25 }
    },
  
    // Océanie
    {
      code: 'AU',
      name: 'Australie',
      flag: '🇦🇺',
      currency: { code: 'AUD', symbol: '$', rate: 390.0 }
    },
    {
      code: 'PG',
      name: 'Papouasie-Nouvelle-Guinée',
      flag: '🇵🇬',
      currency: { code: 'PGK', symbol: 'K', rate: 170.0 }
    },
    {
      code: 'FJ',
      name: 'Fidji',
      flag: '🇫🇯',
      currency: { code: 'FJD', symbol: '$', rate: 255.0 }
    },
    {
      code: 'WS',
      name: 'Samoa',
      flag: '🇼🇸',
      currency: { code: 'WST', symbol: 'T', rate: 220.0 }
    },
    {
      code: 'NZ',
      name: 'Nouvelle-Zélande',
      flag: '🇳🇿',
      currency: { code: 'NZD', symbol: '$', rate: 365.0 }
    },
  
    // Amérique du Sud
    {
      code: 'BR',
      name: 'Brésil',
      flag: '🇧🇷',
      currency: { code: 'BRL', symbol: 'R$', rate: 120.0 }
    },
    {
      code: 'AR',
      name: 'Argentine',
      flag: '🇦🇷',
      currency: { code: 'ARS', symbol: '$', rate: 1.75 }
    },
    {
      code: 'CL',
      name: 'Chili',
      flag: '🇨🇱',
      currency: { code: 'CLP', symbol: '$', rate: 0.67 }
    },

    // Amérique Centrale & Caraïbes
    {
      code: 'CU',
      name: 'Cuba',
      flag: '🇨🇺',
      currency: { code: 'CUP', symbol: '$', rate: 24.0 }
    },
    {
      code: 'HT',
      name: 'Haïti',
      flag: '🇭🇹',
      currency: { code: 'HTG', symbol: 'G', rate: 6.5 }
    },
    {
      code: 'JM',
      name: 'Jamaïque',
      flag: '🇯🇲',
      currency: { code: 'JMD', symbol: '$', rate: 0.4 }
    },
  
    // Moyen-Orient
    {
      code: 'AE',
      name: 'Émirats arabes unis',
      flag: '🇦🇪',
      currency: { code: 'AED', symbol: 'د.إ', rate: 163.35 }
    },
    {
      code: 'SA',
      name: 'Arabie saoudite',
      flag: '🇸🇦',
      currency: { code: 'SAR', symbol: '﷼', rate: 160.0 }
    },
    {
      code: 'IL',
      name: 'Israël',
      flag: '🇮🇱',
      currency: { code: 'ILS', symbol: '₪', rate: 165.0 }
    }
  ];