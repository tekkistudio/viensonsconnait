// src/features/product/context/chatReducer.ts
import type { ChatState, ChatAction } from '../types/chat';
import { GENERIC_MESSAGES } from '../utils/chatMessages';

export const ASSISTANT_INFO = {
  name: 'Rose',
  title: 'Assistante'
};

const cleanupMessages = (messages: any[]): any[] => {
  if (messages.length > 50) {
    return messages.slice(-50);
  }
  return messages;
};

export const initialState: ChatState = {
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
    conversationHistory: [],
    summary: undefined,
    country: ''
  },
  formStep: '',
  isTyping: false,
  showCheckout: false,
  payment: {
    selectedMethod: null,
    status: 'idle'
  },
  paymentModal: {
    isOpen: false,
    iframeUrl: '',
    provider: undefined
  }
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'RESET_ORDER':
      return {
        ...initialState,
        messages: [{
          type: 'assistant',
          content: 'D\'accord, reprenons depuis le début. Quel est votre nom complet ?',
          assistant: ASSISTANT_INFO,
        }],
        formStep: 'contact-info'
      };

    case 'ADD_MESSAGE':
      const updatedMessages = cleanupMessages([
        ...state.messages,
        {
          ...action.payload,
          assistant: action.payload.type === 'assistant' ? ASSISTANT_INFO : undefined,
        },
      ]);

      const updatedHistory = cleanupMessages([
        ...state.orderData.conversationHistory,
        {
          ...action.payload,
          assistant: action.payload.type === 'assistant' ? ASSISTANT_INFO : undefined,
        }
      ]);

      return {
        ...state,
        messages: updatedMessages,
        orderData: {
          ...state.orderData,
          conversationHistory: updatedHistory
        }
      };

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload,
      };

    case 'UPDATE_ORDER_DATA':
      const updatedOrderData = {
        ...state.orderData,
        ...action.payload,
      };
      
      // Vérification de la complétude des informations nécessaires
      const hasRequiredInfo = 
        updatedOrderData.firstName &&
        updatedOrderData.lastName &&
        updatedOrderData.city &&
        updatedOrderData.address &&
        updatedOrderData.phone &&
        updatedOrderData.items.length > 0;

      return {
        ...state,
        orderData: updatedOrderData,
        formStep: hasRequiredInfo && action.payload.city ? 'summary' : state.formStep
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

    case 'SET_ORDER_SUMMARY':
      return {
        ...state,
        orderData: {
          ...state.orderData,
          summary: action.payload
        }
      };

    case 'SET_PAYMENT_MODAL':
      return {
        ...state,
        paymentModal: {
          ...state.paymentModal,
          ...action.payload
        }
      };

    case 'SELECT_PAYMENT_METHOD':
      return {
        ...state,
        payment: {
          ...state.payment,
          selectedMethod: action.payload,
          status: 'pending',
          error: undefined
        }
      };

    case 'SET_PAYMENT_STATUS': {
      const newMessages = cleanupMessages([
        ...state.messages,
        ...(action.payload.status === 'completed' ? [{
          type: 'assistant',
          content: '✅ Paiement confirmé ! Votre commande est en cours de traitement.',
          metadata: {
            paymentStatus: 'completed',
            transactionId: action.payload.transactionId
          }
        }] : []),
        ...(action.payload.status === 'failed' ? [{
          type: 'assistant',
          content: '❌ Le paiement a échoué. Voulez-vous réessayer ?',
          choices: ['Réessayer', 'Choisir un autre mode de paiement'],
          metadata: {
            paymentStatus: 'failed',
            error: action.payload.error
          }
        }] : [])
      ]);

      return {
        ...state,
        messages: newMessages,
        payment: {
          ...state.payment,
          status: action.payload.status,
          transactionId: action.payload.transactionId,
          error: action.payload.error,
        }
      };
    }

    case 'RESET_PAYMENT':
      return {
        ...state,
        payment: initialState.payment,
        paymentModal: initialState.paymentModal
      };

    default:
      return state;
  }
}