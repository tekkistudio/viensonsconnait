// types/payment-config.ts
export interface PaymentMethod {
    id: string;
    name: string;          // ex: "Wave", "Orange Money", "Carte bancaire"
    type: string;          // "mobile_money" | "card" | "cash_on_delivery"
    provider: string;      // "wave" | "orange" | "stripe" | "cash"
    isActive: boolean;     // true/false pour activer/désactiver
    countryAvailability: string[]; // ["SN", "CI", "ML"]
    minimumAmount: number;
    maximumAmount: number | null;
    fees: {
      type: "fixed" | "percentage";
      value: number;
    };
    metadata: {
      icon?: string;
      displayName?: string;
      description?: string;
      requiredFields?: string[];
    };
    created_at: string;
    updated_at: string;
  }
  
  export interface CountryConfig {
    code: string;         // "SN", "CI", etc.
    name: string;         // "Sénégal", "Côte d'Ivoire"
    currency: string;     // "XOF"
    isActive: boolean;
    allowedPaymentMethods: string[]; // IDs des méthodes de paiement
    shippingOptions: {
      type: string;
      price: number;
      estimatedDays: string;
    }[];
  }