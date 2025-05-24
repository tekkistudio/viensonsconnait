// src/lib/services/ChatFlowManager.ts
import type { ChatMessage, ChatOrderData, ConversationStep, OrderData, OrderMetadata, StepValidation, MessageFlags } from '@/types/chat';
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';
import { AbandonedCart } from '@/types/order';

export class ChatFlowManager {
    private static instance: ChatFlowManager;
    private botInfo = {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };

    private readonly defaultChoices: Record<ConversationStep, string[]> = {
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
      'payment_method': ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
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
      'express_payment': ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
      'express_summary': ['Valider la commande', 'Modifier ma commande'],
      'express_modify': ['Quantité', 'Adresse', 'Mode de paiement'],
      'express_error': ['Réessayer', 'Contacter le support'],
      
      // Pour compatibilité avec le code existant
      'collect_has_email': ['Oui, j\'ai un e-mail', 'Non, je n\'en ai pas'],
      'process_email_response': [],
      'process_quantity': [], 
      'add_other_products': ['Oui, je veux bien', 'Non, juste celui-là'],
      'add_product_choice': [],
      'add_notes': ['Oui, je veux bien', 'Non, pas la peine'],
      'save_note': [],
      'payment_error': ['Réessayer', 'Changer de méthode', 'Contacter le support'],
      'contact_info': [],
      'add_product': [], // ou des options spécifiques si nécessaire
      'modify_order': ['Modifier la quantité', 'Modifier l\'adresse', 'Modifier mes informations'],
      'confirm_address': ['Oui, même adresse', 'Non, nouvelle adresse'],
      'update_address': [],
      'confirm_existing_info': []
    } as const;
      
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
      orderData: Partial<OrderData>
    ): Promise<StepValidation> {
      // Vérifier si l'étape a déjà été validée avec un flag spécifique
      const stepAlreadyValidated = orderData.metadata?.flags?.[`${currentStep}_validated`] === true;
      
      if (stepAlreadyValidated) {
        console.log(`Step ${currentStep} already validated, returning cached validation`);
        return {
          isValid: true,
          nextStep: this.getNextStep(currentStep),
          metadata: {
            flags: {
              [`${currentStep}_validated`]: true,
              cached: true
            }
          }
        };
      }
      
      // Validation spécifique pour chaque étape
      try {
        switch (currentStep) {
          case 'collect_quantity':
            return this.validateQuantity(input);
          case 'collect_phone':
            return this.validatePhone(input);
          case 'collect_name':
            return this.validateName(input);
          case 'collect_has_email':
            return this.validateHasEmail(input);
          case 'collect_email':
            return this.validateEmail(input);
          case 'collect_city':
            return this.validateCity(input);
          case 'collect_address':
            return this.validateAddress(input, orderData.city);
          case 'collect_email_opt':
            return this.validateEmailOpt(input);
          case 'recommend_products':
            return this.validateRecommendationChoice(input);
          case 'add_notes':
            return this.validateNotes(input);
          case 'order_summary':
            return this.validateOrderSummary(input);
          case 'payment_method':
            return this.validatePaymentMethod(input);
          case 'create_account':
            return this.validateAccountChoice(input);
          default:
            // Pour les étapes sans validation spécifique
            return {
              isValid: true,
              nextStep: this.getNextStep(currentStep),
              metadata: {
                flags: {
                  [`${currentStep}_validated`]: true
                }
              }
            };
        }
      } catch (error) {
        console.error(`Error validating step ${currentStep}:`, error);
        return {
          isValid: false,
          nextStep: currentStep,
          error: error instanceof Error ? error.message : 'Une erreur est survenue lors de la validation'
        };
      }
    }

  public validateQuantity(quantity: string): StepValidation {
    // Essayer de convertir en nombre
    const num = parseInt(quantity);
    
    // Vérifier si c'est un nombre valide
    if (isNaN(num)) {
      return {
        isValid: false,
        nextStep: 'collect_quantity',
        error: 'Veuillez entrer un nombre valide.'
      };
    }
    
    // Vérifier la plage
    if (num <= 0) {
      return {
        isValid: false,
        nextStep: 'collect_quantity',
        error: 'La quantité doit être supérieure à 0.'
      };
    }
    
    if (num > 10) {
      return {
        isValid: false,
        nextStep: 'collect_quantity',
        error: 'La quantité maximum est de 10 exemplaires. Veuillez choisir une quantité entre 1 et 10.'
      };
    }
    
    // Si tout est valide
    return {
      isValid: true,
      nextStep: 'collect_name',
      metadata: {
        quantity: num,
        flags: {
          quantity_validated: true,
          quantityHandled: true
        }
      }
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

  public async validateHasEmail(response: string): Promise<StepValidation> {
    // Normaliser et analyser l'entrée de l'utilisateur
    const normalizedResponse = response.toLowerCase().trim();
    
    // Expressions qui indiquent "oui"
    const yesPatterns = ['oui', 'yes', 'j\'ai', 'j ai', 'ouais', 'bien sûr'];
    // Expressions qui indiquent "non"
    const noPatterns = ['non', 'no', 'pas', 'nop', 'je n\'ai pas', 'je n ai pas'];
    
    const isYes = yesPatterns.some(pattern => normalizedResponse.includes(pattern));
    const isNo = noPatterns.some(pattern => normalizedResponse.includes(pattern));
    
    // Si ce n'est ni oui ni non clairement, demander précision
    if (!isYes && !isNo) {
      return {
        isValid: false,
        nextStep: 'collect_has_email',
        error: 'Veuillez répondre par "Oui, j\'ai un e-mail" ou "Non, je n\'en ai pas"'
      };
    }
    
    const hasEmail = isYes;
    
    return {
      isValid: true,
      nextStep: hasEmail ? 'collect_email' : 'collect_city',
      metadata: {
        emailConfirmed: hasEmail,
        flags: {
          has_email_validated: true,
          emailConfirmed: hasEmail,
          emailResponseHandled: true
        }
      }
    };
  }

  public validateEmail(email: string): StepValidation {
    if (email.toLowerCase() === 'non') {
      return {
        isValid: true,
        nextStep: 'recommend_products'
      };
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
      nextStep: 'recommend_products',
      error: emailRegex.test(email)
        ? undefined
        : 'Veuillez entrer une adresse email valide'
    };
  }

  public validateEmailOpt(response: string): StepValidation {
    const normalizedResponse = response.toLowerCase().trim();
    const wantsEmail = normalizedResponse.includes('oui');
    
    return {
      isValid: true,
      nextStep: wantsEmail ? 'collect_email' : 'recommend_products',
      metadata: {
        flags: {
          email_opt_validated: true,
          wantsEmail: wantsEmail
        }
      }
    };
  }

  public validateCity(city: string): StepValidation {
    // CORRECTION: Assouplir la validation pour accepter la plupart des entrées textuelles
    const cityName = city.trim();
    
    // Log pour debug
    console.log(`Validating city: "${cityName}", length: ${cityName.length}`);
    
    // Validation très simple - accepte presque tout sauf les chaînes vides ou trop courtes
    if (cityName.length < 2) {
      return {
        isValid: false,
        nextStep: 'collect_city',
        error: 'Veuillez entrer un nom de ville valide (au moins 2 caractères).'
      };
    }
    
    // Accepter la ville si elle a au moins 2 caractères
    return {
      isValid: true,
      nextStep: 'collect_address',
      metadata: {
        city: cityName,
        flags: {
          city_validated: true
        }
      }
    };
  }

  public validateAddress(address: string, city?: string): StepValidation {
    return {
      isValid: address.length >= 5,
      nextStep: 'collect_email_opt',
      error: address.length >= 5
        ? undefined
        : `Veuillez entrer une adresse complète à ${city || 'votre ville'}`
    };
  }

  public validateRecommendationChoice(input: string): StepValidation {
    const normalizedInput = input.toLowerCase().trim();
    const wantsRecommendations = normalizedInput.includes('oui') || normalizedInput.includes('montrez');
    
    return {
      isValid: true,
      nextStep: wantsRecommendations ? 'select_product' : 'order_summary',
      metadata: {
        flags: {
          recommendations_choice_validated: true,
          wantsRecommendations: wantsRecommendations
        }
      }
    };
  }
  
  public validateNotes(notes: string): StepValidation {
    return {
      isValid: true, // Les notes sont optionnelles
      nextStep: 'order_summary'
    };
  }
  
  public validateOrderSummary(response: string): StepValidation {
    const normalizedResponse = response.toLowerCase().trim();
    const isConfirmed = normalizedResponse.includes('correct') || normalizedResponse.includes('oui');
    
    return {
      isValid: true,
      nextStep: isConfirmed ? 'payment_method' : 'collect_quantity', // Revenir au début si modification demandée
      metadata: {
        flags: {
          order_summary_validated: true,
          orderConfirmed: isConfirmed
        }
      }
    };
  }
  
  public validatePaymentMethod(method: string): StepValidation {
    const validMethods = ['wave', 'orange_money', 'carte bancaire', 'carte', 'payer à la livraison', 'livraison'];
    const normalizedMethod = method.toLowerCase().trim();
    
    // Vérifier si la méthode correspond à l'une des méthodes valides
    const isValid = validMethods.some(validMethod => normalizedMethod.includes(validMethod));
    
    if (!isValid) {
      return {
        isValid: false,
        nextStep: 'payment_method',
        error: 'Veuillez choisir une méthode de paiement parmi celles proposées'
      };
    }
    
    // Déterminer la méthode exacte
    let matchedMethod: string;
    
    if (normalizedMethod.includes('wave')) {
      matchedMethod = 'WAVE';
    } else if (normalizedMethod.includes('orange')) {
      matchedMethod = 'ORANGE_MONEY';
    } else if (normalizedMethod.includes('carte')) {
      matchedMethod = 'CARD';
    } else {
      matchedMethod = 'CASH_ON_DELIVERY';
    }
    
    return {
      isValid: true,
      nextStep: 'payment_processing',
      metadata: {
        paymentMethod: matchedMethod,
        flags: {
          payment_method_validated: true,
          paymentMethodSelected: true
        }
      }
    };
  }
  
  public validateAccountChoice(input: string): StepValidation {
    const normalizedInput = input.toLowerCase().trim();
    const wantsAccount = normalizedInput.includes('oui') || normalizedInput.includes('créer');
    
    return {
      isValid: true,
      nextStep: wantsAccount ? 'create_account_email' : 'post_purchase',
      metadata: {
        flags: {
          account_choice_validated: true,
          wantsAccount: wantsAccount
        }
      }
    };
  }

  public getNextStep(currentStep: ConversationStep): ConversationStep {
    const flow: Record<ConversationStep, ConversationStep> = {
      // Étapes initiales d'exploration
      'initial': 'collect_quantity',
      'description': 'initial',
      'testimonials': 'initial',
      'game_rules': 'initial',
      
      // Étapes du flux standard
      'collect_quantity': 'collect_name', 
      'collect_name': 'collect_phone',
      'collect_phone': 'check_existing',
      'check_existing': 'collect_city', 
      'collect_city': 'collect_address',
      'collect_address': 'collect_email_opt',
      'collect_email_opt': 'collect_email',
      'collect_email': 'recommend_products',
      'recommend_products': 'select_product', 
      'modify_order': 'collect_quantity',
      'select_product': 'additional_quantity',
      'additional_quantity': 'order_summary',
      'order_summary': 'payment_method',
      'payment_method': 'payment_processing',
      'payment_processing': 'payment_complete',
      'payment_complete': 'create_account',
      'create_account': 'create_account_email', 
      'create_account_email': 'create_account_password',
      'create_account_password': 'post_purchase',
      'post_purchase': 'initial',
      
      // Étapes du flux express
      'choose_flow': 'express_name',            // Ajouté: choix du flow
      'express_order': 'express_name',          // Ajouté: démarrage express
      'express_name': 'express_phone',          // Ajouté: nom en express
      'express_phone': 'express_address',       // Ajouté: téléphone en express
      'express_address': 'express_city',        // Ajouté: adresse en express
      'express_city': 'express_payment',        // Ajouté: ville en express
      'express_payment': 'express_summary',     // Ajouté: paiement en express
      'express_summary': 'payment_complete',    // Ajouté: résumé en express
      'express_modify': 'express_summary',      // Ajouté: modification en express
      'express_error': 'express_payment',       // Ajouté: erreur en express
      
      // Pour compatibilité avec le code existant
      'collect_has_email': 'process_email_response',
      'process_email_response': 'collect_email',
      'process_quantity': 'add_other_products', 
      'add_other_products': 'select_product',
      'add_product_choice': 'add_notes',               
      'add_notes': 'save_note',
      'save_note': 'order_summary',
      'payment_error': 'payment_method',
      'contact_info': 'collect_phone',
      'confirm_address': 'collect_quantity', 
      'update_address': 'collect_city',       
      'add_product': 'add_notes',
      'confirm_existing_info': 'collect_quantity' 
    } as const;
  
    return flow[currentStep] || 'initial';
  }

  public async setCurrentStep(sessionId: string, step: ConversationStep): Promise<void> {
    try {
      // Mettre à jour la base de données avec la nouvelle étape
      const { error } = await supabase
        .from('conversations')
        .update({
          metadata: {
            step,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', sessionId);
      
      if (error) {
        console.warn('Error updating conversation step:', error);
      }
      
      // Sauvegarder également l'état du panier abandonné
      await supabase
        .from('abandoned_carts')
        .update({ 
          cart_stage: step,
          last_active_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) {
            console.warn('Error updating abandoned cart step:', error);
          }
        });
        
    } catch (error) {
      console.error('Error in setCurrentStep:', error);
      throw error;
    }
  }

  public async saveProgress(
    sessionId: string,
    step: ConversationStep,
    data: Partial<ChatOrderData>
  ): Promise<void> {
    try {
      // Vérifier si la progression a déjà été sauvegardée pour cette étape spécifique
      const stepAlreadySaved = data.metadata?.flags?.[`${step}_saved`] === true;
      
      if (stepAlreadySaved) {
        console.log(`Progress for step ${step} already saved, skipping duplicate save`);
        return;
      }
      
      // Timestamps pour le suivi
      const timestamp = new Date().toISOString();
      
      // Créer une metadata valide
      const metadata: OrderMetadata = {
        ...data.metadata as OrderMetadata,
        source: data.metadata?.source || 'chatbot',
        storeId: data.metadata?.storeId || '',
        productId: data.metadata?.productId || '',
        conversationId: sessionId,
        createdAt: data.metadata?.createdAt || timestamp,
        updatedAt: timestamp,
        conversationHistory: data.metadata?.conversationHistory || [],
        flags: {
          ...(data.metadata?.flags || {}),
          [`${step}_saved`]: true,
          lastSavedStep: step,
          lastSavedAt: timestamp
        },
        messageHandled: true
      };
  
      // Préparer les données du panier
    const cartData: Partial<AbandonedCart> = {
      id: sessionId,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email,
      phone: data.phone || '',
      city: data.city || '',
      address: data.address || '',
      cart_stage: step,
      last_active_at: timestamp,
      metadata: {
        orderData: {
          ...data,
          metadata,
          formStep: step
        } as unknown as Partial<OrderData>,
        lastUpdate: timestamp,
        // Autres propriétés de base
        source: data.metadata?.source || 'chatbot',
        storeId: data.metadata?.storeId || '',
        productId: data.metadata?.productId || '',
        conversationId: sessionId,
        createdAt: data.metadata?.createdAt || timestamp,
        updatedAt: timestamp,
        conversationHistory: data.metadata?.conversationHistory || []
      }
    };
    
    // Ajouter progressHistory de manière sûre
    if ('progressHistory' in (cartData.metadata || {})) {
      (cartData.metadata as any).progressHistory = [
        ...((data.metadata as any)?.progressHistory || []),
        { step, timestamp }
      ];
    } else {
      // La première fois, initialiser le tableau
      (cartData.metadata as any).progressHistory = [{ step, timestamp }];
    }
  
      // Mettre à jour le panier abandonné
      const { error } = await supabase
        .from('abandoned_carts')
        .upsert(cartData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
  
      if (error) {
        console.error('Error saving progress:', error);
        throw error;
      }
  
      // Mettre à jour également la conversation si elle existe
      await supabase
        .from('conversations')
        .update({
          metadata: {
            step,
            lastUpdate: timestamp
          }
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) {
            console.warn('Could not update conversation step:', error);
          }
        });
  
    } catch (error) {
      console.error('Error in saveProgress:', error);
      throw error;
    }
  }

  private isOrderComplete(data: Partial<OrderData>): boolean {
    return !!(
      data.first_name &&
      data.phone &&
      data.city &&
      data.address &&
      Array.isArray(data.items) &&
      data.items.length > 0
    );
  }

  private async updateCustomer(data: Partial<OrderData>): Promise<void> {
    try {
      const customerData = {
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        phone: data.phone,
        email: data.email,
        city: data.city,
        address: data.address,
        country_code: 'SN', // Par défaut Sénégal
        status: 'active',
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', data.phone)
        .single();

      if (existing) {
        await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('customers')
          .insert({
            ...customerData,
            total_orders: 0,
            total_spent: 0,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }
}