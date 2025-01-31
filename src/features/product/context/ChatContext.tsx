// src/features/product/context/ChatContext.tsx
import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { chatReducer, initialState, ASSISTANT_INFO } from './chatReducer';
import { useOrderManagement } from '../hooks/useOrderManagement';
import { usePaymentFlow } from '../hooks/usePaymentFlow';
import { generateInitialMessages, GENERIC_CHOICES } from '../utils/chatMessages';
import { toMutableArray } from '@/features/product/utils/arrayHelpers';
import useCountryStore from '@/core/hooks/useCountryStore';
import { DeliveryService } from '@/lib/services/delivery.service';
import { PaymentGateway } from '@/lib/services/payment-gateway';
import { ConversationFlowManager } from '@/lib/services/ConversationFlowManager';
import { CustomerInfo, PaymentProvider, PaymentMethodType } from '@/types/payment';
import type { 
  ChatContextType, 
  ChatProviderProps,
  ChatMessage,
  OrderData
} from '../types/chat';

const ChatContext = createContext<ChatContextType | null>(null);

// Services initialization
const paymentGateway = new PaymentGateway();
const deliveryService = new DeliveryService();
const conversationManager = ConversationFlowManager.getInstance();

const methodMap: Record<string, PaymentProvider> = {
  'wave': 'WAVE',
  'om': 'ORANGE_MONEY',
  'cod': 'CASH'
};

export function ChatProvider({ children, product }: ChatProviderProps) {
  const { convertPrice } = useCountryStore();

  // Initialize state with welcome messages
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    messages: [
      {
        type: 'assistant',
        content: generateInitialMessages(convertPrice)[product.id].welcome,
        assistant: ASSISTANT_INFO,
      },
      {
        type: 'user-choices',
        content: '',
        choices: toMutableArray(GENERIC_CHOICES.initial),
      },
    ],
  });

  useEffect(() => {
    const cleanup = () => {
      if (state.messages.length > 50) {
        dispatch({ 
          type: 'ADD_MESSAGE', 
          payload: state.messages[state.messages.length - 1] 
        });
      }
    };

    const interval = setInterval(cleanup, 5 * 60 * 1000); // Toutes les 5 minutes
    
    return () => {
      clearInterval(interval);
    };
  }, [state.messages]);

  // Initialize product in state
  useEffect(() => {
    if (product && !state.orderData.items.length) {
      const item = {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        totalPrice: product.price
      };
      
      dispatch({
        type: 'ADD_PRODUCT_TO_ORDER',
        payload: item
      });
    }
  }, [product, state.orderData.items.length]);

  const orderManagement = useOrderManagement({
    orderData: state.orderData,
    dispatch,
    addBotResponse: async (messages) => {
      for (const message of messages) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: message
        });
      }
    }
  });

  const paymentFlow = usePaymentFlow({
    orderData: state.orderData,
    dispatch,
    addBotResponse: async (messages) => {
      for (const message of messages) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: message
        });
      }
    },
    calculateOrderTotal: orderManagement.calculateOrderTotal
  });

  const handleMessage = useCallback((message: ChatMessage) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: message
    });
  }, []);

  const handleUserChoice = useCallback(async (choice: string) => {
    // Add user choice to messages
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { type: 'user', content: choice }
    });

    try {
      // Set typing state
      dispatch({ type: 'SET_TYPING', payload: true });

      // Get responses from ConversationFlowManager
      const responses = await conversationManager.handleUserChoice(choice, {
        step: state.formStep,
        productId: product.id,
        orderData: state.orderData,
        lastUserChoice: choice
      });

      // Process responses one by one
      for (const response of responses) {
        // Handle payment actions
        if (response.type.includes('button')) {
          const buttonType = response.type.replace('-button', '');
          const paymentMethod = methodMap[buttonType];
          
          if (paymentMethod) {
            const customerInfo = {
              name: `${state.orderData.firstName} ${state.orderData.lastName}`,
              phone: state.orderData.phone,
              city: state.orderData.city
            };
            await paymentFlow.handleMobilePayment(paymentMethod, customerInfo);
          }
          continue;
        }

        // Add response to messages
        dispatch({
          type: 'ADD_MESSAGE',
          payload: response
        });

        // Update form step if needed
        if (response.metadata?.nextStep) {
          dispatch({
            type: 'SET_FORM_STEP',
            payload: response.metadata.nextStep
          });
        }

        // Update order data if present
        if (response.metadata?.orderData) {
          dispatch({
            type: 'UPDATE_ORDER_DATA',
            payload: response.metadata.orderData
          });
        }
      }
    } catch (error) {
      console.error('Error in handleUserChoice:', error);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: "Je suis désolée, une erreur s'est produite. Puis-je vous aider autrement ?",
          choices: ["Recommencer", "Voir les produits", "Contacter le support"]
        }
      });
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, [state.formStep, state.orderData, product.id, paymentFlow]);

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    handleUserChoice,
    handleMessage,
    calculateOrderTotal: orderManagement.calculateOrderTotal,
    handleQuantityModification: orderManagement.updateQuantity,
    handlePaymentInitiation: async (
      method: PaymentMethodType,
      customerInfo: CustomerInfo
    ): Promise<void> => {
      await paymentFlow.handleMobilePayment(method, customerInfo);
    }
  }), [
    state,
    handleUserChoice,
    handleMessage,
    orderManagement,
    paymentFlow
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
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