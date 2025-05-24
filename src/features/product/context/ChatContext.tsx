// src/features/product/context/ChatContext.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { AIManager } from '@/lib/services/AIManager';
import type { OrderData as BaseOrderData } from '@/types/order';
import type { 
  ChatMessage, 
  ConversationStep,
  ChatAction
} from '@/types/chat';
import type {
  OrderData,
  PaymentProvider,
  PaymentTotal,
  CustomerInfo,
  ProductRecommendation,
  RecommendationContext
} from '@/types/order';
import type { Product } from '@/types/product';

type ChatOrderData = Omit<BaseOrderData, 'subtotal'> & {
  subtotal?: number;
};

interface ChatContextValue {
  messages: ChatMessage[];
  isTyping: boolean;
  orderData: ChatOrderData;  
  payment: {
    status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
    error: string | null;
    clientSecret: string | null;
    transactionId?: string;
  };
  paymentModal: {
    isOpen: boolean;
    iframeUrl: string;
    provider?: PaymentProvider;
  };
  dispatch: (action: ChatAction) => void;
  sendMessage: (content: string) => Promise<void>;
  handlePaymentInitiation: (method: PaymentProvider, customerInfo: CustomerInfo) => Promise<void>;
  setPaymentModal: (data: { 
    isOpen: boolean; 
    iframeUrl?: string; 
    provider?: PaymentProvider 
  }) => void;
  calculateOrderTotal: () => PaymentTotal;
  handleUserChoice: (choice: string) => Promise<void>;
  handleQuantityChange: (quantity: number) => void;
  handleQuantityModification: (productId: string, quantity: number) => Promise<boolean>;
  handleProductSelect?: (product: Product) => void;
  getProductRecommendations?: (context: RecommendationContext) => Promise<ProductRecommendation[]>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
  product: Product;
}

export function ChatProvider({ children, product }: ChatProviderProps) {
  const store = useChatStore();
  const {
    messages,
    isTyping,
    orderData,
    payment,
    paymentModal,
    sendMessage: storeSendMessage,
    initiatePayment,
    setPaymentModal: storeSetPaymentModal,
    formStep,
    updateOrderData
  } = store;

  const aiManager = AIManager.getInstance();

  const dispatch = useCallback((action: ChatAction) => {
    switch (action.type) {
      case 'ADD_MESSAGE':
        store.addMessage(action.payload);
        break;
      case 'SET_PAYMENT_STATUS':
        store.setPaymentStatus(action.payload);
        break;
      case 'SET_PAYMENT_MODAL':
        store.setPaymentModal(action.payload);
        break;
      case 'UPDATE_ORDER_DATA':
        store.updateOrderData(action.payload);
        break;
      case 'SET_TYPING':
        store.setTyping(action.payload);
        break;
      default:
        console.warn('Unhandled action type:', action.type);
    }
  }, [store]);

  const sendMessage = useCallback(async (content: string) => {
    try {
      // Envoyer d'abord le message utilisateur au store
      await storeSendMessage(content);

      // Obtenir la réponse de l'IA
      const aiResponse = await aiManager.handleProductChatbot(
        { content, type: 'user' },
        product.id,
        formStep as ConversationStep,
        orderData
      );

      // Mettre à jour le store avec la réponse
      if (aiResponse.content) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'assistant',
            content: aiResponse.content,
            choices: aiResponse.choices,
            metadata: {
              nextStep: aiResponse.nextStep,
              buyingIntent: aiResponse.buyingIntent,
              recommendations: aiResponse.recommendations,
              showQuantitySelector: aiResponse.nextStep === 'collect_quantity',
              maxQuantity: 10
            }
          }
        });

        // Mettre à jour les données de la commande si nécessaire
        if (aiResponse.nextStep) {
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: { formStep: aiResponse.nextStep }
          });
        }
      }

    } catch (error) {
      console.error('Error in sendMessage:', error);
    }
  }, [storeSendMessage, aiManager, product.id, formStep, orderData, dispatch]);

  const handlePaymentInitiation = useCallback(async (
    method: PaymentProvider,
    customerInfo: CustomerInfo
  ) => {
    try {
      await initiatePayment(method);

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: "💳 Initialisation du paiement...",
          metadata: {
            paymentStatus: 'processing'
          }
        }
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: "Une erreur est survenue lors de l'initialisation du paiement. Veuillez réessayer.",
          choices: ["Réessayer", "Choisir un autre mode de paiement"]
        }
      });
    }
  }, [initiatePayment, dispatch]);

  const calculateOrderTotal = useCallback((): PaymentTotal => {
    const subtotal = orderData.items.reduce((total: number, item: any) => {
      return total + (item.price * item.quantity);
    }, 0);

    const deliveryCost = orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
    const total = subtotal + deliveryCost;

    return {
      value: total,
      formatted: `${total.toLocaleString()} FCFA`,
      originalInFCFA: total
    };
  }, [orderData]);

  const handleUserChoice = useCallback(async (choice: string) => {
    await sendMessage(choice);
  }, [sendMessage]);

  const handleQuantityChange = useCallback((quantity: number) => {
    dispatch({
      type: 'UPDATE_ORDER_DATA',
      payload: { quantity }
    });
  }, [dispatch]);

  const handleQuantityModification = useCallback(async (
    productId: string,
    quantity: number
  ): Promise<boolean> => {
    if (quantity < 1) return false;

    try {
      const response = await fetch('/api/products/check-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      const data = await response.json();
      if (!data.available) {
        await sendMessage("Désolé, la quantité demandée n'est pas disponible en stock.");
        return false;
      }

      dispatch({
        type: 'UPDATE_ORDER_DATA',
        payload: {
          items: orderData.items.map((item: any) => 
            item.productId === productId 
              ? { ...item, quantity, totalPrice: item.price * quantity }
              : item
          )
        }
      });

      return true;
    } catch (error) {
      console.error('Error modifying quantity:', error);
      return false;
    }
  }, [orderData.items, sendMessage, dispatch]);

  const handleProductSelect = useCallback((product: Product) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        type: 'assistant',
        content: `Excellent choix ! J'ajoute ${product.name} à votre commande.`,
        metadata: {
          showQuantitySelector: true,
          maxQuantity: 10
        }
      }
    });
  }, [dispatch]);

  const setPaymentModal = useCallback((data: { 
    isOpen: boolean; 
    iframeUrl?: string; 
    provider?: PaymentProvider 
  }) => {
    storeSetPaymentModal(data);
  }, [storeSetPaymentModal]);

  const value: ChatContextValue = {
    messages,
    isTyping,
    orderData: {
      ...orderData,
      subtotal: orderData.items.reduce((total, item) => 
        total + (item.price * item.quantity), 0
      )
    },
    payment,
    paymentModal,
    dispatch,
    sendMessage,
    handlePaymentInitiation,
    setPaymentModal,
    calculateOrderTotal,
    handleUserChoice,
    handleQuantityChange,
    handleQuantityModification,
    handleProductSelect
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}