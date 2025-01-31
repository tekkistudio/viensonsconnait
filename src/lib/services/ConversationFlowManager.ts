// src/lib/services/ConversationFlowManager.ts

import { CONVERSION_CHOICES, STRUCTURED_CHOICES } from '@/features/product/utils/conversationChoices';
import { generateInitialMessages, GENERIC_MESSAGES } from '@/features/product/utils/chatMessages';
import { ProductId } from '@/config/products';
import { toMutableArray } from '@/features/product/utils/arrayHelpers';
import useCountryStore from '@/core/hooks/useCountryStore';
import { calculateDeliveryPrice, calculateDiscount } from '@/features/product/utils/priceCalculator';
import type { 
  ChatMessage, 
  ConversationStep,
  OrderData,
  MessageType,
  OrderItem
} from '@/features/product/types/chat';
import type { PaymentProvider } from '@/types/payment';

interface ConversationState {
  step: ConversationStep;
  productId: ProductId;
  orderData: OrderData;
  lastUserChoice?: string;
}

export class ConversationFlowManager {
  private static instance: ConversationFlowManager;
  private convertPrice: (price: number) => { value: number; formatted: string; };

  private constructor() {
    this.convertPrice = (price: number) => ({
      value: price,
      formatted: `${price.toLocaleString()} FCFA`
    });
  }

  public static getInstance(): ConversationFlowManager {
    if (!ConversationFlowManager.instance) {
      ConversationFlowManager.instance = new ConversationFlowManager();
    }
    return ConversationFlowManager.instance;
  }

  private async addTypingDelay(): Promise<void> {
    const delay = Math.random() * 1000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async handleUserChoice(
    choice: string,
    state: ConversationState
  ): Promise<ChatMessage[]> {
    try {
      await this.addTypingDelay();
      
      const messages = generateInitialMessages(this.convertPrice);
      const productMessages = messages[state.productId];

      // Uniformiser les choix similaires
      const normalizedChoice = choice === "Voir les témoignages" 
        ? "Je veux voir les témoignages" 
        : choice === "Payer avec le téléphone"
        ? "Wave"
        : choice === "Payer par carte bancaire"
        ? "card"
        : choice;

      switch (normalizedChoice) {
        case "Voir des exemples de questions":
          return [{
            type: 'assistant',
            content: this.formatMessage(productMessages.sampleQuestions),
            choices: toMutableArray(STRUCTURED_CHOICES.afterDescription)
          }];

        case CONVERSION_CHOICES.buyNow:
        case "Commander 1 jeu":
          return [{
            type: 'assistant',
            content: 'Pour procéder à votre commande, j\'ai besoin de quelques informations. Tout d\'abord, quel est votre nom complet ?',
            metadata: {
              intent: 0.9,
              nextStep: 'contact-info',
              orderData: {
                items: [{
                  ...state.orderData.items[0],
                  quantity: 1
                }]
              }
            }
          }];

        case CONVERSION_CHOICES.seeMore:
          return [{
            type: 'assistant',
            content: this.formatMessage(productMessages.description, true),
            choices: toMutableArray(STRUCTURED_CHOICES.afterDescription),
            metadata: {
              intent: 0.5,
              productContext: state.productId
            }
          }];

        case CONVERSION_CHOICES.seePricing:
        case "Voir les packs disponibles":
          return [{
            type: 'assistant',
            content: this.formatMessage(productMessages.pricing(this.convertPrice)),
            choices: toMutableArray(STRUCTURED_CHOICES.afterPricing),
            metadata: {
              intent: 0.7,
              productContext: state.productId
            }
          }];

        case CONVERSION_CHOICES.multipleGames:
          return this.handleMultipleGamesFlow();

        case "2 exemplaires":
        case "3 exemplaires":
        case "4 exemplaires ou plus":
          return this.handleQuantitySelection(choice, state);

        case "Comment y jouer ?":
          return [{
            type: 'assistant',
            content: this.formatMessage(productMessages.howToPlay, true),
            choices: toMutableArray(STRUCTURED_CHOICES.initial)
          }];

        case "Je veux voir les témoignages":
          return [{
            type: 'assistant',
            content: productMessages.testimonials,
            choices: toMutableArray(STRUCTURED_CHOICES.afterTestimonials)
          }];

        case "Wave":
        case "card":
        case "Orange Money":
        case "Payer à la livraison":
          return this.handlePaymentMethodSelection(normalizedChoice, state);

        case CONVERSION_CHOICES.confirmOrder:
          return this.handleOrderConfirmation();

        case CONVERSION_CHOICES.modifyOrder:
          return this.handleOrderModification();

        case "Contacter le support":
        return [{
            type: 'assistant',
            content: `Pour contacter notre support :
        
        📱 WhatsApp : +221 78 136 27 28
        📧 Email : bonjour@viensonconnait.com
        ⏰ Disponible du lundi au vendredi, 9h-18h
        
        Comment souhaitez-vous nous contacter ?`,
            choices: [
            "WhatsApp",
            "Email",
            "Retourner à l'accueil"
            ]
        }];
        
        case "WhatsApp":
            return [{
                type: 'assistant',
                content: "Je vous redirige vers WhatsApp...",
                metadata: {
                externalUrl: {
                    type: 'whatsapp',
                    url: `https://wa.me/221781362728?text=Bonjour, j'ai besoin d'aide pour une commande sur votre site web`,
                    description: 'Redirection vers WhatsApp pour le support'
                },
                action: 'redirect'
                }
            }];
        
        case "Email":
            return [{
                type: 'assistant',
                content: "Je vous redirige vers votre application de messagerie...",
                metadata: {
                externalUrl: {
                    type: 'email',
                    url: 'mailto:bonjour@viensonconnait.com?subject=Support VIENS ON S\'CONNAÎT',
                    description: 'Envoi d\'email au support'
                },
                action: 'redirect'
                }
            }];

        default:
          return this.handleFormStep(choice, state);
      }
    } catch (error) {
      console.error('Error in handleUserChoice:', error);
      return [{
        type: 'assistant',
        content: "Je suis désolée, une erreur s'est produite. Puis-je vous aider autrement ?",
        choices: toMutableArray(["Recommencer", "Voir les produits", "Contacter le support"])
      }];
    }
  }

  private formatMessage(content: string | undefined, isLongText: boolean = false): string {
    if (!content) return '';
    return content.trim();
  }

  private formatOrderItems(items: OrderItem[]): string {
    return items.map(item => {
      const quantity = item.quantity;
      const name = item.name.replace('Pour Les', 'Pour les');
      const totalPrice = (item.price * quantity) - calculateDiscount(quantity, item.price);
      return `${quantity} ${quantity > 1 ? 'Jeux' : 'Jeu'} ${name} - ${totalPrice.toLocaleString()} FCFA`;
    }).join('\n');
  }

  private async handleMultipleGamesFlow(): Promise<ChatMessage[]> {
    return [{
      type: 'assistant',
      content: 'Combien d\'exemplaires souhaitez-vous commander ?',
      choices: toMutableArray(STRUCTURED_CHOICES.multipleGames)
    }];
  }

  private async handleQuantitySelection(
    choice: string,
    state: ConversationState
  ): Promise<ChatMessage[]> {
    const quantity = parseInt(choice);
    return [{
      type: 'assistant',
      content: 'Pour procéder à votre commande, j\'ai besoin de quelques informations. Tout d\'abord, quel est votre nom complet ?',
      metadata: {
        intent: 0.9,
        nextStep: 'contact-info',
        orderData: {
          items: state.orderData.items.map(item => ({
            ...item,
            quantity: quantity
          }))
        }
      }
    }];
  }

  private async handlePaymentMethodSelection(
    method: string,
    state: ConversationState
  ): Promise<ChatMessage[]> {
    const methodMap: Record<string, PaymentProvider> = {
      'Wave': 'WAVE',
      'card': 'STRIPE',
      'Orange Money': 'ORANGE_MONEY',
      'Payer à la livraison': 'CASH'
    };

    const messageTypeMap: Record<PaymentProvider, MessageType> = {
      'WAVE': 'wave-button',
      'ORANGE_MONEY': 'om-button',
      'CASH': 'cod-button',
      'STRIPE': 'card'
    };

    const provider = methodMap[method];
    if (!provider) {
      throw new Error('Méthode de paiement non supportée');
    }

    if (provider === 'CASH') {
      return [{
        type: 'assistant',
        content: `✅ Votre commande a bien été enregistrée !

📦 Notre livreur vous contactera au <strong>${state.orderData.phone}</strong> pour organiser la livraison à :
<strong>${state.orderData.address}
${state.orderData.city}</strong>

💰 Montant à payer à la livraison : <strong>${(state.orderData.totalAmount || 0).toLocaleString()} FCFA</strong>

À très bientôt ! 🌟`,
        choices: ["Suivre ma commande", "J'ai une question"]
      }];
    }

    return [{
      type: messageTypeMap[provider],
      content: this.getPaymentMessage(method, state.orderData),
      metadata: {
        paymentStatus: 'pending',
        nextStep: 'payment-processing',
        paymentType: provider
      }
    }];
  }

  private async handleOrderConfirmation(): Promise<ChatMessage[]> {
    return [{
      type: 'assistant',
      content: `Excellent ! Comment souhaitez-vous effectuer le paiement ?

⚠️ Les personnes qui payent à l'avance sont prioritaires pour la livraison`,
      choices: toMutableArray(STRUCTURED_CHOICES.paymentMethods)
    }];
  }

  private async handleOrderModification(): Promise<ChatMessage[]> {
    return [{
      type: 'assistant',
      content: 'D\'accord, reprenons depuis le début. Quel est votre nom complet ?',
      metadata: {
        nextStep: 'contact-info'
      }
    }];
  }

  private async handleFormStep(
    value: string,
    state: ConversationState
  ): Promise<ChatMessage[]> {
    const { currentCountry } = useCountryStore.getState();

    switch (state.step) {
      case 'contact-info': {
        const names = value.split(' ');
        if (names.length < 2) {
          return [{
            type: 'assistant',
            content: 'Veuillez fournir votre prénom et votre nom.'
          }];
        }
        return [{
          type: 'assistant',
          content: GENERIC_MESSAGES.askCity(names[0]),
          metadata: {
            nextStep: 'city',
            orderData: {
              firstName: names[0],
              lastName: names.slice(1).join(' ')
            }
          }
        }];
      }

      case 'city':
        const deliveryPrice = calculateDeliveryPrice(value);
        return [{
          type: 'assistant',
          content: GENERIC_MESSAGES.askAddress(value),
          metadata: {
            nextStep: 'address',
            orderData: {
              city: value,
              country: currentCountry?.name,
              deliveryCost: deliveryPrice
            }
          }
        }];

      case 'address':
        return [{
          type: 'assistant',
          content: GENERIC_MESSAGES.askPhone,
          metadata: {
            nextStep: 'phone',
            orderData: { address: value }
          }
        }];

      case 'phone':
        if (!this.validatePhoneNumber(value)) {
          return [{
            type: 'assistant',
            content: 'Ce numéro ne semble pas valide. Veuillez fournir un numéro valide.'
          }];
        }
        return this.generateOrderSummary({
          ...state,
          orderData: {
            ...state.orderData,
            phone: value
          }
        });

      default:
        return [{
          type: 'assistant',
          content: 'Je ne comprends pas votre demande. Pouvez-vous reformuler ?',
          choices: toMutableArray(STRUCTURED_CHOICES.initial)
        }];
    }
  }

  private validatePhoneNumber(phone: string): boolean {
    return /^\d{9,}$/.test(phone.replace(/\s/g, ''));
  }

  private getPaymentMessage(method: string, orderData: OrderData): string {
    const amount = (orderData.totalAmount || 0).toLocaleString();
    switch (method) {
      case 'Wave':
        return `Vous allez recevoir une demande de paiement Wave de ${amount} FCFA`;
      case 'Orange Money':
        return `Vous allez recevoir une demande de paiement Orange Money de ${amount} FCFA`;
      case 'card':
        return `Vous allez être redirigé vers la page de paiement sécurisée pour payer ${amount} FCFA`;
      default:
        return `Notre livreur vous contactera au <strong>${orderData.phone}</strong> pour organiser la livraison`;
    }
  }

  private async generateOrderSummary(state: ConversationState): Promise<ChatMessage[]> {
    const { currentCountry } = useCountryStore.getState();
    
    // Calcul de la livraison
    const deliveryPrice = calculateDeliveryPrice(state.orderData.city || '');
    
    // Calcul du total
    const subtotal = state.orderData.items.reduce((acc, item) => {
      const basePrice = item.price;
      const quantity = item.quantity;
      const discount = calculateDiscount(quantity, basePrice);
      return acc + ((basePrice * quantity) - discount);
    }, 0);

    const total = subtotal + deliveryPrice;

    return [{
      type: 'assistant',
      content: `📋<strong>Récapitulatif de votre commande :</strong>

🛍️ Vous avez commandé :
<strong>${this.formatOrderItems(state.orderData.items)}</strong>

📍 Vos Informations de Livraison :
Nom : <strong>${state.orderData.firstName} ${state.orderData.lastName}</strong>
Adresse : <strong>${state.orderData.address}</strong>
Ville : <strong>${state.orderData.city}</strong>
Pays : <strong>${currentCountry?.name || 'Non spécifié'}</strong>
Téléphone : <strong>${state.orderData.phone}</strong>

${deliveryPrice > 0 ? `📦 Frais de livraison : ${deliveryPrice.toLocaleString()} FCFA\n` : '📦 Livraison gratuite\n'}
💰 Total : ${total.toLocaleString()} FCFA

Ces informations sont-elles correctes ?`,
      choices: toMutableArray(STRUCTURED_CHOICES.orderConfirmation),
      metadata: {
        orderData: {
          ...state.orderData,
          totalAmount: total
        }
      }
    }];
  }
}