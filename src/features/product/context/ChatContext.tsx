// src/features/product/context/ChatContext.tsx
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import crypto from 'crypto';
import type { Product } from '../../../types/product';
import type { ChatState, ChatAction, ChatMessage, OrderItem } from '../types/chat';
import { CONVERSION_CHOICES, STRUCTURED_CHOICES } from '../utils/conversationChoices';
import { generateInitialMessages, GENERIC_CHOICES, GENERIC_MESSAGES } from '../utils/chatMessages';
import { PAYMENT_URLS } from '../../../config/payment';
import { PRODUCTS_INFO, type ProductId, isValidProduct } from '../../../config/products';
import { CROSS_SELLING } from '../../../config/crossSelling';
import useCountryStore from '../../../core/hooks/useCountryStore';
import { AIService } from '../../../lib/services/ai.service';
import { paymentService } from '../../../lib/services/payment.service';
import { PaymentModal } from '../components/PaymentModal';


const ASSISTANT_INFO = {
  name: 'Rose',
  title: 'Assistante',
};

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;  // Ajout de dispatch
  handleUserChoice: (choice: string) => Promise<void>;
  calculateOrderTotal: () => { value: number; formatted: string; originalInFCFA: number };
  handleQuantityModification: (choice: string) => Promise<void>; 
}

const ChatContext = createContext<ChatContextType | null>(null);

const initialState: ChatState = {
  messages: [],
  orderData: {
    items: [],  
    contactInfo: '',
    firstName: '',
    lastName: '',
    city: '',
    address: '',
    phone: '',
    paymentMethod: '',
    orderDetails: '',
  },
  formStep: '',
  isTyping: false,
  showCheckout: false,
  paymentModal: {
    isOpen: false,
    iframeUrl: ''
  }
};

  function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
      case 'ADD_MESSAGE':
        return {
          ...state,
          messages: [
            ...state.messages,
            {
              ...action.payload,
              assistant: action.payload.type === 'assistant' ? ASSISTANT_INFO : undefined,
            },
          ],
        };
  
      case 'SET_TYPING':
        return {
          ...state,
          isTyping: action.payload,
        };
  
      case 'ADD_PRODUCT_TO_ORDER':
        return {
          ...state,
          orderData: {
            ...state.orderData,
            items: [...state.orderData.items, action.payload],
            currentItem: action.payload,
          }
        };

      case 'SET_PAYMENT_MODAL':
        return {
          ...state,
          paymentModal: action.payload
        };
  
      case 'REMOVE_PRODUCT_FROM_ORDER':
        return {
          ...state,
          orderData: {
            ...state.orderData,
            items: state.orderData.items.filter(item => item.productId !== action.payload),
            currentItem: undefined,
          }
        };
  
      case 'UPDATE_PRODUCT_QUANTITY':
        return {
          ...state,
          orderData: {
            ...state.orderData,
            items: state.orderData.items.map(item => 
              item.productId === action.payload.productId
                ? {
                    ...item,
                    quantity: action.payload.quantity,
                    totalPrice: item.price * action.payload.quantity
                  }
                : item
            ),
          }
        };
  
      case 'SET_FORM_STEP':
        return {
          ...state,
          formStep: action.payload,
        };
  
      case 'SET_SHOW_CHECKOUT':
        return {
          ...state,
          showCheckout: action.payload,
        };
  
      case 'SET_CURRENT_PRODUCT_CONTEXT':
        return {
          ...state,
          currentProductContext: action.payload,
        };
  
      case 'UPDATE_ORDER_DATA':
        return {
          ...state,
          orderData: { ...state.orderData, ...action.payload },
        };
  
      default:
        return state;
    }
  }

  export function ChatProvider({ children, product }: { children: React.ReactNode; product: { id: ProductId } & Product; }) {
 
  const { convertPrice } = useCountryStore();
  const messages = generateInitialMessages(convertPrice);
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    messages: [
      {
        type: 'assistant',
        content: messages[product.id].welcome,
        assistant: ASSISTANT_INFO,
      },
      {
        type: 'user-choices',
        choices: [...GENERIC_CHOICES['initial']],
      },
    ],
  });

  const createAIResponseMessages = (aiResponse: any, buyingIntent: number) => {
    const choices = buyingIntent > 0.6 
      ? [CONVERSION_CHOICES.buyNow, ...(aiResponse.choices || [])]
      : aiResponse.choices;
  
    const messages: ChatMessage[] = [
      {
        type: 'assistant',
        content: aiResponse.content,
        assistant: ASSISTANT_INFO,
        choices,
        metadata: {
          ...aiResponse.metadata,
          recommendations: buyingIntent < 0.4 ? ['mobile-app'] : []
        }
      }
    ];
  
    if (choices && choices.length > 0) {
      messages.push({
        type: 'user-choices' as const,
        choices: choices
      });
    }
  
    return messages;
  };

  const addBotResponse = useCallback(async (responses: ChatMessage[], delay = 1000) => {
    dispatch({ type: 'SET_TYPING', payload: true });

    for (const response of responses) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          ...response,
          assistant: response.type === 'assistant' ? ASSISTANT_INFO : undefined,
        },
      });
    }

    dispatch({ type: 'SET_TYPING', payload: false });
  }, []);

  const addProductToOrder = useCallback((productId: ProductId, quantity: number = 1) => {
    const newItem = {
      productId,
      name: PRODUCTS_INFO[productId].name,
      quantity,
      price: PRODUCTS_INFO[productId].price,
      totalPrice: PRODUCTS_INFO[productId].price * quantity
    };
  
    dispatch({
      type: 'UPDATE_ORDER_DATA',
      payload: {
        items: [...state.orderData.items, newItem],
        currentItem: newItem
      }
    });
  }, [state.orderData.items]);

  const calculateOrderTotal = useCallback(() => {
    const subtotal = state.orderData.items.reduce((accumulator, item) => {
      let itemTotal = 0;
      if (item.quantity >= 4) {
        itemTotal = item.price * item.quantity * 0.8;
      } else if (item.quantity === 3) {
        itemTotal = 35700;
      } else if (item.quantity === 2) {
        itemTotal = 25200;
      } else {
        itemTotal = item.price * item.quantity;
      }
      return accumulator + itemTotal;
    }, 0);
      
    const deliveryCost = state.orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
    const totalInFCFA = subtotal + deliveryCost;
  
    return {
      value: totalInFCFA,
      formatted: `${totalInFCFA.toLocaleString()} FCFA`,
      originalInFCFA: totalInFCFA
    };
  }, [state.orderData.items, state.orderData.city]);

  const handlePostPurchaseRecommendation = useCallback(async () => {
    // S'assurer qu'il y a des items dans la commande
    if (state.orderData.items && state.orderData.items.length > 0) {
      const lastPurchasedProduct = state.orderData.items[state.orderData.items.length - 1];
      if (lastPurchasedProduct && lastPurchasedProduct.productId) {
        const recommendations = CROSS_SELLING[lastPurchasedProduct.productId as keyof typeof PRODUCTS_INFO];
        
        if (recommendations?.length > 0) {
          const recommendedProduct = PRODUCTS_INFO[recommendations[0].id];
          await addBotResponse([{
            type: 'assistant',
            content: `Félicitations pour votre achat ! 🎉 Je pense que vous pourriez aussi être intéressé(e) par notre jeu "${recommendedProduct.name}"`,
            choices: ["Oui, je suis intéressé(e)", "Non merci"]
          }]);
        }
      }
    }
  }, [state.orderData.items, addBotResponse]);

  const handleProductManagement = useCallback(async (choice: string) => {
    if (choice.startsWith('add_')) {
      const [_, productId, quantityStr] = choice.split('_');
      if (isValidProduct(productId)) {
        const quantity = parseInt(quantityStr);
        addProductToOrder(productId, quantity);
        
        const currentTotal = calculateOrderTotal(); 
        await addBotResponse([{
          type: 'assistant',
          content: `J'ai ajouté ${quantity} exemplaire${quantity > 1 ? 's' : ''} du jeu "${PRODUCTS_INFO[productId].name}" à votre panier.\n\nTotal actuel : ${currentTotal.formatted}\n\nQue souhaitez-vous faire ?`,
          choices: [
            'Ajouter un autre jeu',
            'Voir mon panier',
            'Procéder au paiement'
          ],
        }]);
      }
    } 
    else if (choice === 'Voir mon panier') {
      const total = calculateOrderTotal();
      await addBotResponse([{
        type: 'assistant',
        content: `📋 Votre panier contient :
  ${state.orderData.items.map(item => 
    `- ${item.quantity}x ${item.name} (${convertPrice(item.price * item.quantity).formatted})`
  ).join('\n')}
  
  💰 Total : ${total.formatted}
  
  Que souhaitez-vous faire ?`,
        choices: [
          'Ajouter un autre jeu',
          'Modifier les quantités',
          'Procéder au paiement'
        ],
      }]);
    }
    // Modification des quantités
    else if (choice === 'Modifier les quantités') {
      if (state.orderData.items.length === 0) {
        await addBotResponse([{
          type: 'assistant',
          content: 'Votre panier est vide. Voulez-vous découvrir nos jeux ?',
          choices: ['Découvrir les jeux', 'Parler à un conseiller'],
        }]);
        return;
      }
  
      await addBotResponse([{
        type: 'assistant',
        content: 'Quel jeu souhaitez-vous modifier ?',
        choices: [
          ...state.orderData.items.map(item => `modifier_${item.productId}`),
          'Retour au panier'
        ],
      }]);
    }
    // Procéder au paiement
    else if (choice === 'Procéder au paiement') {
      dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
    }
    // Ajouter un autre jeu
    else if (choice === 'Ajouter un autre jeu') {
        const recommendedProducts = Object.keys(PRODUCTS_INFO)
          .filter(id => !state.orderData.items.some(item => item.productId === id))
          .slice(0, 3);
    
        await addBotResponse([{
          type: 'assistant',
          content: 'Voici d\'autres jeux qui pourraient vous intéresser :',
          choices: [
            ...recommendedProducts.map(id => `voir_${id}`),
            'Retour au panier'
          ],
        }]);
      }
    }, [state.orderData.items, addBotResponse, addProductToOrder, convertPrice, calculateOrderTotal, PRODUCTS_INFO]);


    const handleQuantityModification = useCallback(async (choice: string) => {
      const [action, productId] = choice.split('_');
      const item = state.orderData.items.find(item => item.productId === productId);
      
      if (!item) return;
    
      if (action === 'augmenter') {
        dispatch({
          type: 'UPDATE_PRODUCT_QUANTITY',
          payload: { productId, quantity: item.quantity + 1 }
        });
      } else if (action === 'diminuer' && item.quantity > 1) {
        dispatch({
          type: 'UPDATE_PRODUCT_QUANTITY',
          payload: { productId, quantity: item.quantity - 1 }
        });
      } else if (action === 'supprimer' || (action === 'diminuer' && item.quantity === 1)) {
        dispatch({
          type: 'REMOVE_PRODUCT_FROM_ORDER',
          payload: productId
        });
      }
    
      // On utilise calculateOrderTotal() directement
      const total = calculateOrderTotal();
      await addBotResponse([{
        type: 'assistant',
        content: `✅ Panier mis à jour !
    
    ${state.orderData.items.map(item => 
      `- ${item.quantity}x ${item.name} (${convertPrice(item.price * item.quantity).formatted})`
    ).join('\n')}
    
    💰 Total : ${total.formatted}
    
    Que souhaitez-vous faire ?`,
        choices: [
          'Ajouter un autre jeu',
          'Modifier les quantités',
          'Procéder au paiement'
        ],
      }]);
    }, [state.orderData.items, addBotResponse, dispatch, convertPrice, calculateOrderTotal]);

  const handleOrderCompletion = useCallback(async () => {
    const lastItem = state.orderData.items[state.orderData.items.length - 1];
    const recommendations = CROSS_SELLING[lastItem.productId as keyof typeof PRODUCTS_INFO];
  
    if (recommendations?.length > 0) {
      const recommendedProduct = PRODUCTS_INFO[recommendations[0].id];
      await addBotResponse([
        {
          type: 'assistant',
          content: `🎉 Votre commande a été enregistrée avec succès ! 
          
  En fonction de votre achat, je pense que vous pourriez aussi aimer notre jeu "${recommendedProduct.name}". Les clients qui ont acheté ${lastItem.name} ont aussi beaucoup apprécié celui-ci.
          
  Souhaitez-vous en savoir plus ?`,
          choices: [
            "Oui, montrez-moi",
            "Non merci",
            "Télécharger l'app mobile"
          ],
          metadata: {
            recommendations: ['mobile-app'],
            productContext: recommendations[0].id  
          }
        }
      ]);
    }
  }, [state.orderData.items, addBotResponse]);

  const calculateTotal = useMemo(() => {
    return () => {
      const subtotal = state.orderData.items.reduce((accumulator, item) => {
        let itemTotal = 0;
  
        if (item.quantity >= 4) {
          itemTotal = item.price * item.quantity * 0.8;
        } else if (item.quantity === 3) {
          itemTotal = 35700;
        } else if (item.quantity === 2) {
          itemTotal = 25200;
        } else {
          itemTotal = item.price * item.quantity;
        }
  
        return accumulator + itemTotal;
      }, 0);
      
      const deliveryCost = state.orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
      const totalInFCFA = subtotal + deliveryCost;
  
      const convertedTotal = convertPrice(totalInFCFA);
      return {
        value: convertedTotal.value,
        formatted: convertedTotal.formatted,
        originalInFCFA: totalInFCFA
      };
    };
  }, [state.orderData.items, state.orderData.city, convertPrice]);

  const handleGeneralChoice = useCallback(
    async (choice: string) => {
        if (
            (GENERIC_CHOICES['initial'] as readonly string[]).includes(choice) ||
            (GENERIC_CHOICES['afterDescription'] as readonly string[]).includes(choice) ||
            (GENERIC_CHOICES['afterTestimonials'] as readonly string[]).includes(choice) ||
            (GENERIC_CHOICES['afterPricing'] as readonly string[]).includes(choice) ||
            (GENERIC_CHOICES['multipleGames'] as readonly string[]).includes(choice)
          ) {
        switch (choice) {
          case CONVERSION_CHOICES.buyNow:
            dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
            await addBotResponse([
              {
                type: 'assistant',
                content: 'Pour procéder à votre commande, j\'ai besoin de quelques informations. Tout d\'abord, quel est votre nom complet ?',
                assistant: ASSISTANT_INFO,
              },
            ]);
            break;

          case CONVERSION_CHOICES.seeMore:
              await addBotResponse([
                {
                  type: 'assistant',
                  content: generateInitialMessages(convertPrice)[product.id].description,
                  assistant: ASSISTANT_INFO,
                },
                {
                  type: 'user-choices',
                  choices: [CONVERSION_CHOICES.buyNow, ...GENERIC_CHOICES['afterDescription']],
                },
              ]);
              break;

          case CONVERSION_CHOICES.multipleGames:
              await addBotResponse([
                {
                  type: 'assistant',
                  content: 'Combien d\'exemplaires souhaitez-vous commander ?',
                  assistant: ASSISTANT_INFO,
                },
                {
                  type: 'user-choices',
                  choices: [...GENERIC_CHOICES['multipleGames']],
                },
              ]);
              break;

          case '2 exemplaires':
          case '3 exemplaires':
          case '4 exemplaires ou plus':
            const quantityToAdd = choice === '2 exemplaires' ? 2 : 
                                choice === '3 exemplaires' ? 3 : 4;
            
            dispatch({ 
              type: 'ADD_PRODUCT_TO_ORDER',
              payload: {
                productId: product.id,
                name: product.name,
                quantity: quantityToAdd,
                price: product.price,
                totalPrice: product.price * quantityToAdd
              } as OrderItem
            });
            dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
            await addBotResponse([{
              type: 'assistant',
              content: 'Pour procéder à votre commande, j\'ai besoin de quelques informations. Tout d\'abord, quel est votre nom complet ?',
              assistant: ASSISTANT_INFO,
            }]);
            break;

          case CONVERSION_CHOICES.seePricing:
              await addBotResponse([
                {
                  type: 'assistant',
                  content: generateInitialMessages(convertPrice)[product.id].pricing(convertPrice),
                  assistant: ASSISTANT_INFO,
                },
                {
                  type: 'user-choices',
                  choices: [CONVERSION_CHOICES.buyNow, ...GENERIC_CHOICES['afterPricing']],
                },
              ]);
              break;

              default:
                const aiResponse = await AIService.getResponse({ content: choice, type: 'user' }, product.id);
                const buyingIntent = aiResponse.buyingIntent || 0;
                const messages = createAIResponseMessages(aiResponse, buyingIntent);
                await addBotResponse(messages);
                break;
              }
              } else {
                const aiResponse = await AIService.getResponse({ content: choice, type: 'user' }, product.id);
                const buyingIntent = aiResponse.buyingIntent || 0;
                const messages = createAIResponseMessages(aiResponse, buyingIntent);
                await addBotResponse(messages);
              }
              },
              [product, addBotResponse, convertPrice]
              );

  const handleUserChoice = useCallback(
    async (choice: string) => {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { type: 'user', content: choice },
      });

      switch (state.formStep) {
        case 'contact-info':
          const names = choice.split(' ');
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: {
              firstName: names[0],
              lastName: names.slice(1).join(' '),
              contactInfo: choice,
            },
          });
          dispatch({ type: 'SET_FORM_STEP', payload: 'city' });
          await addBotResponse([
            {
              type: 'assistant',
              content: GENERIC_MESSAGES.askCity(names[0]),
              assistant: ASSISTANT_INFO,
            },
          ]);
          break;

        case 'city':
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: { city: choice },
          });
          dispatch({ type: 'SET_FORM_STEP', payload: 'address' });
          await addBotResponse([
            {
              type: 'assistant',
              content: GENERIC_MESSAGES.askAddress(choice),
              assistant: ASSISTANT_INFO,
            },
          ]);
          break;

        case 'address':
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: { address: choice },
          });
          dispatch({ type: 'SET_FORM_STEP', payload: 'phone' });
          await addBotResponse([
            {
              type: 'assistant',
              content: GENERIC_MESSAGES.askPhone,
              assistant: ASSISTANT_INFO,
            },
          ]);
          break;

        case 'phone':
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: { phone: choice },
          });
          dispatch({ type: 'SET_FORM_STEP', payload: 'payment' });
          await addBotResponse([
            {
              type: 'assistant',
              content: 'Par quel moyen souhaitez-vous payer ?',
              assistant: ASSISTANT_INFO,
            },
            {
              type: 'user-choices',
              choices: [...GENERIC_CHOICES['paymentMethods']]
            },
          ]);
          break;

          case 'payment':
  const total = calculateTotal();
  // Mise à jour des infos de commande
  dispatch({
    type: 'UPDATE_ORDER_DATA',
    payload: { 
      paymentMethod: choice,
      orderDetails: `Commande de ${state.orderData.items.reduce((sum, item) => sum + item.quantity, 0)} exemplaire${
        state.orderData.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''
      } du jeu "${product.name}"`
    },
  });

  // Afficher le récapitulatif
  await addBotResponse([{
    type: 'assistant',
    content: `<strong>📋 Récapitulatif de votre commande</strong>
    
${state.orderData.orderDetails}

<strong>📍 Informations de livraison :</strong>
Nom complet : <strong>${state.orderData.firstName} ${state.orderData.lastName}</strong>
Ville : <strong>${state.orderData.city}</strong>
Adresse de livraison : <strong>${state.orderData.address}</strong>
Téléphone : <strong>${state.orderData.phone}</strong>
Frais de livraison : <strong>${convertPrice(state.orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000).formatted}</strong>

💰 Total à payer : <strong>${total.formatted}</strong>`,
    assistant: ASSISTANT_INFO,
  }]);

  // Initier le paiement
try {
  // Générer un ID de commande
  const orderId = state.orderData.orderId || 
    (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(7));
  
  // Initier le paiement
  const response = await paymentService.createPayment({
    amount: total.value,
    currency: 'XOF',
    customerInfo: {
      name: `${state.orderData.firstName} ${state.orderData.lastName}`,
      phone: state.orderData.phone,
      city: state.orderData.city
    },
    orderId,
    paymentMethod: choice === 'wave' ? 'WAVE' : 'ORANGE_MONEY'
  });

  if (response.paymentData) {
    if (choice.toLowerCase() === 'wave' && response.paymentData.redirectUrl) {
      // Pour Wave, redirection vers l'app
      if (typeof window !== 'undefined') {
        const redirectUrl = response.paymentData.redirectUrl;
        window.location.assign(redirectUrl);
      }
    } else if (response.paymentData.iframeUrl) {
      // Pour Orange Money, afficher le modal
      dispatch({
        type: 'SET_PAYMENT_MODAL',
        payload: {
          isOpen: true,
          iframeUrl: response.paymentData.iframeUrl
        }
      });
    } else {
      throw new Error('Aucune URL de paiement reçue');
    }
  } else {
    throw new Error('Données de paiement invalides');
  }
} catch (error) {
  console.error('Payment initiation failed:', error);
  await addBotResponse([{
    type: 'assistant',
    content: "Je suis désolée, nous rencontrons un problème technique avec le paiement. Voulez-vous réessayer ?",
    choices: ["Réessayer", "Choisir un autre mode de paiement"]
  }]);
}
break;

default:
  await handleGeneralChoice(choice);
  break;
}
},
[state.formStep, state.orderData, product.name, addBotResponse, handleGeneralChoice, convertPrice, calculateTotal]
);

  return (
    <ChatContext.Provider 
      value={{ 
        state, 
        dispatch,  // Ajout de dispatch
        handleUserChoice,
        calculateOrderTotal,
        handleQuantityModification
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

export default ChatProvider;