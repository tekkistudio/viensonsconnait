// src/lib/services/ChatFlowManager.ts
import type { 
  ChatMessage, 
  ChatOrderData, 
  ConversationStep, 
  StepValidation, 
  MessageFlags,
  OrderMetadata
} from '@/types/chat';
import type { AbandonedCart } from '@/types/order';
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';

export class ChatFlowManager {
    private static instance: ChatFlowManager;
    private botInfo = {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };

    private readonly defaultChoices: Record<string, string[]> = {
      // Étapes initiales d'exploration
      'initial': ["Je veux l'acheter maintenant", "Je veux en savoir plus", "Je veux voir les témoignages"],
      'description': [],
      'testimonials': [],
      'game_rules': [],
      
      // Étapes du flux standard
      'collect_quantity': [],
      'collect_name': [],
      'collect_phone': [],
      'check_existing': ['Oui, même adresse', 'Non, nouvelle adresse'],
      'collect_city': [],
      'collect_address': [],
      'collect_email_opt': ['Oui', 'Non, merci'],
      'collect_email': [],
      'recommend_products': ['Oui, montrez-moi', 'Non, juste celui-ci'],
      'select_product': [],
      'additional_quantity': [],
      'order_summary': ["C'est correct", "Je veux modifier"],
      'payment_method': ['Wave', 'Carte bancaire', 'Payer à la livraison'],
      'payment_processing': ['J\'ai payé', 'Je rencontre un problème', 'Changer de méthode'],
      'payment_complete': ['Voir ma commande', 'Quand sera-t-elle livrée?', 'Merci, au revoir'],
      'create_account': ['Oui, créer un compte', 'Pas maintenant, merci'],
      'create_account_email': [],
      'create_account_password': [],
      'post_purchase': ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'],
      
      // Étapes du flux express
      'choose_flow': ["✅ Commander rapidement (moins d'1 minute)", "🤖 Être guidé pas à pas avec mes conseils"],
      'express_order': [],
      'express_name': [],
      'express_phone': [],
      'express_address': [],
      'express_city': [],
      'express_payment': ['Wave', 'Carte bancaire', 'Payer à la livraison'],
      'express_summary': ['Valider la commande', 'Modifier ma commande'],
      'express_modify': ['Quantité', 'Adresse', 'Mode de paiement'],
      'express_error': ['Réessayer', 'Contacter le support'],
      
      // Nouvelles étapes du système optimisé
      'initial_engagement': ['⚡ Acheter maintenant', '❓ Poser une question', '📦 Infos livraison', '💬 Parler à Rose'],
      'mode_selection': ['⚡ Express (< 1 min)', '🗣️ Accompagné'],
      'express_contact': [],
      'order_complete': ['🔍 Suivre ma commande', '📞 Nous contacter', '🛍️ Autres produits'],
      'question_mode': ['❓ Comment ça marche ?', '👥 C\'est pour qui ?', '💝 Quels bénéfices ?', '⭐ Avis clients'],
      'delivery_info': ['⚡ Commander maintenant', '📞 Autres questions', '🏠 Changer d\'adresse'],
      'product_info': [],
      'customer_service': [],
      'out_of_stock': ['📧 Me prévenir', '🔄 Voir alternatives'],
      'error_recovery': ['🔄 Réessayer', '📞 Contacter le support']
    };
      
    public getChoicesForStep(step: ConversationStep): string[] {
      return this.defaultChoices[step] || [];
    }
    
    private constructor() {}
    
    public static getInstance(): ChatFlowManager {
      if (!this.instance) {
        this.instance = new ChatFlowManager();
      }
      return this.instance;
    }
  
    public getBotInfo() {
      return this.botInfo;
    }

    public validatePhone(phone: string, countryCode: string = 'SN'): StepValidation {
      const phoneService = PhoneService.getInstance();
      const validation = phoneService.validatePhoneNumber(phone, countryCode);
  
      if (!validation.isValid) {
        return {
          isValid: false,
          nextStep: 'collect_phone',
          error: validation.error || 'Numéro de téléphone invalide'
        };
      }
  
      const { international } = phoneService.formatPhoneWithCountry(phone, countryCode);
  
      return {
        isValid: true,
        nextStep: 'check_existing',
        metadata: {
          phone: international
        }
      };
    }

    public async validateStepData(
      currentStep: ConversationStep,
      input: string,
      orderData: Partial<ChatOrderData>
    ): Promise<StepValidation> {
      try {
        switch (currentStep) {
          case 'collect_quantity':
            return this.validateQuantity(input);
          case 'collect_phone':
            return this.validatePhone(input);
          case 'collect_name':
            return this.validateName(input);
          case 'collect_email':
            return this.validateEmail(input);
          case 'collect_city':
            return this.validateCity(input);
          case 'collect_address':
            return this.validateAddress(input, orderData.city);
          case 'payment_method':
            return this.validatePaymentMethod(input);
          default:
            return {
              isValid: true,
              nextStep: this.getNextStep(currentStep)
            };
        }
      } catch (error) {
        console.error(`Error validating step ${currentStep}:`, error);
        return {
          isValid: false,
          nextStep: currentStep,
          error: 'Une erreur est survenue lors de la validation'
        };
      }
    }

    public validateQuantity(quantity: string): StepValidation {
      const num = parseInt(quantity);
      
      if (isNaN(num) || num <= 0 || num > 10) {
        return {
          isValid: false,
          nextStep: 'collect_quantity',
          error: 'Veuillez entrer une quantité entre 1 et 10.'
        };
      }
      
      return {
        isValid: true,
        nextStep: 'collect_name',
        metadata: { quantity: num }
      };
    }

    public validateName(name: string): StepValidation {
      const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,}$/;
      const words = name.trim().split(/\s+/);
      
      return {
        isValid: nameRegex.test(name) && words.length >= 2,
        nextStep: 'collect_phone',
        error: nameRegex.test(name) && words.length >= 2
          ? undefined
          : 'Veuillez entrer votre nom complet (prénom et nom).'
      };
    }

    public validateEmail(email: string): StepValidation {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        isValid: emailRegex.test(email),
        nextStep: 'recommend_products',
        error: emailRegex.test(email) ? undefined : 'Veuillez entrer une adresse email valide'
      };
    }

    public validateCity(city: string): StepValidation {
      const cityName = city.trim();
      
      if (cityName.length < 2) {
        return {
          isValid: false,
          nextStep: 'collect_city',
          error: 'Veuillez entrer un nom de ville valide.'
        };
      }
      
      return {
        isValid: true,
        nextStep: 'collect_address',
        metadata: { city: cityName }
      };
    }

    public validateAddress(address: string, city?: string): StepValidation {
      return {
        isValid: address.length >= 5,
        nextStep: 'collect_email_opt',
        error: address.length >= 5 ? undefined : 'Veuillez entrer une adresse complète'
      };
    }
    
    public validatePaymentMethod(method: string): StepValidation {
      const validMethods = ['wave', 'carte bancaire', 'carte', 'payer à la livraison', 'livraison'];
      const normalizedMethod = method.toLowerCase().trim();
      
      const isValid = validMethods.some(validMethod => normalizedMethod.includes(validMethod));
      
      if (!isValid) {
        return {
          isValid: false,
          nextStep: 'payment_method',
          error: 'Veuillez choisir une méthode de paiement parmi celles proposées'
        };
      }
      
      let matchedMethod: string;
      if (normalizedMethod.includes('wave')) {
        matchedMethod = 'WAVE';
      } else if (normalizedMethod.includes('carte')) {
        matchedMethod = 'STRIPE';
      } else {
        matchedMethod = 'CASH';
      }
      
      return {
        isValid: true,
        nextStep: 'payment_processing',
        metadata: { paymentMethod: matchedMethod }
      };
    }

    public getNextStep(currentStep: ConversationStep): ConversationStep {
      const flow: Record<string, ConversationStep> = {
        'initial': 'collect_quantity',
        'initial_engagement': 'mode_selection',
        'mode_selection': 'express_contact',
        'express_contact': 'express_address',
        'collect_quantity': 'collect_name', 
        'collect_name': 'collect_phone',
        'collect_phone': 'check_existing',
        'check_existing': 'collect_city', 
        'collect_city': 'collect_address',
        'collect_address': 'collect_email_opt',
        'collect_email_opt': 'collect_email',
        'collect_email': 'recommend_products',
        'recommend_products': 'order_summary',
        'order_summary': 'payment_method',
        'payment_method': 'payment_processing',
        'payment_processing': 'payment_complete',
        'payment_complete': 'post_purchase'
      };
    
      return flow[currentStep] || 'initial';
    }
}