// src/stores/chatStore.ts
import { create } from 'zustand';
import { ChatService } from '@/services/ChatService';
import { generateUUID } from '@/utils/uuid';
import type { 
  ChatMessage, 
  OrderData,
  ChatState,
  ConversationStep,
  ChatOrderData
} from '@/types/chat';
import type { OrderItem, PaymentProvider } from '@/types/order';

const calculateSubtotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
};

const calculateTotalAmount = (subtotal: number, deliveryCost: number): number => {
  return subtotal + deliveryCost;
};


// Définition explicite des types pour le state
interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentProvider;
}

interface PaymentState {
  selectedMethod: PaymentProvider | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  clientSecret: string | null;
  transactionId?: string;
}

interface ChatStore {
  // State
  messages: ChatMessage[];
  orderData: OrderData;
  sessionId: string;
  formStep: ConversationStep;
  isTyping: boolean;
  showCheckout: boolean;
  payment: PaymentState;
  paymentModal: PaymentModalState;
  // Nouveau state pour le mode (express ou standard)
  mode: 'standard' | 'express';

  // Actions
  initialize: (productId: string, storeId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateOrderData: (data: Partial<OrderData>) => void;
  setTyping: (isTyping: boolean) => void;
  initiatePayment: (method: PaymentProvider) => Promise<void>;
  setPaymentModal: (data: {
    isOpen: boolean;
    iframeUrl?: string;
    provider?: PaymentProvider;
  }) => void;
  setPaymentStatus: (status: {
    status: PaymentState['status'];
    transactionId?: string;
    error?: string | null;
  }) => void;
  resetPayment: () => void;
  cleanup: () => void;
  // Nouvelle action pour définir le mode
  setMode: (mode: 'standard' | 'express') => void;
}

const initialState = {
  messages: [],
  orderData: {
    session_id: '',
    status: 'pending' as const,
    paymentStatus: 'pending' as const,
    items: [],
    first_name: '',
    last_name: '',
    city: '',
    address: '',
    phone: '',
    payment_method: undefined,
    order_details: '',
    total_amount: 0,
    delivery_cost: 0,
    subtotal: 0,
    metadata: {
      source: 'chatbot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      storeId: '',
      productId: '',
      conversationId: ''
    }
  } as ChatOrderData,
  sessionId: '',
  formStep: 'initial' as ConversationStep,
  isTyping: false,
  showCheckout: false,
  payment: {
    selectedMethod: null,
    status: 'idle' as const,
    error: null,
    clientSecret: null
  },
  paymentModal: {
    isOpen: false,
    iframeUrl: '',
    provider: undefined
  },
  // Mode par défaut (standard)
  mode: 'standard' as const
};

export const useChatStore = create<ChatStore>((set, get) => {
  const chatService = ChatService.create();

  return {
    ...initialState,

    initialize: async (productId: string, storeId: string) => {
      try {
        if (!productId || !storeId) {
          throw new Error('Product ID and Store ID are required');
        }
    
        set(initialState);
    
        const { sessionId, initialMessage } = await chatService.initializeConversation(
          productId,
          storeId
        );
    
        if (!sessionId || !initialMessage) {
          throw new Error('Failed to initialize chat');
        }
    
        const newOrderData: OrderData = {
          ...initialState.orderData,
          session_id: sessionId, // L'ID sera maintenant un UUID valide
          items: [{
            productId,
            name: initialMessage.metadata?.productContext ? 
              JSON.parse(initialMessage.metadata.productContext).productName : '',
            quantity: 1,
            price: 0,
            totalPrice: 0
          }],
          metadata: {
            ...initialState.orderData.metadata,
            storeId,
            productId,
            conversationId: sessionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
    
        set({ 
          sessionId,
          messages: [initialMessage],
          orderData: newOrderData,
          mode: 'standard'
        });
      } catch (error) {
        console.error('Error initializing chat:', error);
        set(state => ({
          messages: [...state.messages, {
            type: 'assistant',
            content: "Une erreur est survenue lors de l'initialisation du chat.",
            timestamp: new Date().toISOString()
          }]
        }));
        throw error;
      }
    },

    sendMessage: async (content: string) => {
      const state = get();
      set({ isTyping: true });
    
      try {
        if (!state.sessionId) {
          throw new Error('Session not initialized');
        }
    
        // Créer le nouveau message
        const userMessage: ChatMessage = {
          type: 'user',
          content,
          timestamp: new Date().toISOString()
        };
    
        // Mettre à jour l'état avec le nouveau message
        set(state => ({
          messages: [...state.messages, userMessage]
        }));
    
        // Log pour déboguer
        console.log(`Sending user message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}" to session ${state.sessionId}`);
    
        // Appel au service de chat
        try {
          const response = await chatService.handleUserMessage(
            state.sessionId,
            content,
            state.formStep,
            state.orderData
          );
    
          // Vérifier si nous avons une réponse valide
          if (!response || response.length === 0) {
            console.warn('Empty response from chat service');
            throw new Error('No response received from chat service');
          }
    
          // Extraire les informations de progression à partir de la réponse
          const nextStep = response[0]?.metadata?.nextStep;
          const updatedOrderData = response[0]?.metadata?.orderData;
    
          // Mettre à jour l'état avec la réponse
          set(state => ({
            messages: [...state.messages, ...response],
            formStep: nextStep || state.formStep,
            orderData: {
              ...state.orderData,
              ...(updatedOrderData || {})
            }
          }));
    
          // Log pour déboguer
          console.log(`Received ${response.length} response messages, next step: ${nextStep}`);
        } catch (chatError) {
          console.error('Error from chat service:', chatError);
          throw chatError; // Re-throw pour être capturé par le bloc catch externe
        }
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Ajouter un message d'erreur convivial
        set(state => ({
          messages: [...state.messages, {
            type: 'assistant',
            content: "Je suis désolée, une erreur est survenue. Veuillez réessayer.",
            choices: ["Recommencer", "Contacter le support"],
            timestamp: new Date().toISOString()
          }]
        }));
      } finally {
        set({ isTyping: false });
      }
    },

    addMessage: (message: ChatMessage) => {
      set(state => ({
        messages: [...state.messages, message]
      }));
    },

    updateOrderData: (data: Partial<OrderData>) => {
      set(state => ({
        orderData: { 
          ...state.orderData,
          ...data,
          metadata: {
            ...state.orderData.metadata,
            ...(data.metadata || {}),
            updatedAt: new Date().toISOString()
          }
        }
      }));
    },

    setTyping: (isTyping: boolean) => {
      set({ isTyping });
    },

    initiatePayment: async (method: PaymentProvider) => {
      const state = get();
      
      set(state => ({
        payment: {
          ...state.payment,
          selectedMethod: method,
          status: 'processing',
          error: null
        }
      }));

      try {
        const response = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method,
            amount: state.orderData.total_amount,
            orderId: state.orderData.session_id,
            customerInfo: {
              name: `${state.orderData.first_name} ${state.orderData.last_name}`,
              phone: state.orderData.phone,
              city: state.orderData.city
            }
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Payment initialization failed');
        }

        set(state => ({
          payment: {
            ...state.payment,
            clientSecret: data.clientSecret || null
          },
          paymentModal: {
            isOpen: true,
            iframeUrl: data.paymentUrl || '',
            provider: method
          }
        }));

      } catch (error) {
        console.error('Payment error:', error);
        set(state => ({
          payment: {
            ...state.payment,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Payment failed'
          }
        }));
      }
    },

    setPaymentModal: (data) => {
      set(state => ({
        paymentModal: {
          ...state.paymentModal,
          isOpen: data.isOpen,
          iframeUrl: data.iframeUrl || '',
          provider: data.provider
        }
      }));
    },

    setPaymentStatus: (status) => {
      set(state => ({
        payment: {
          ...state.payment,
          status: status.status,
          error: status.error || null,
          transactionId: status.transactionId
        }
      }));
    },

    resetPayment: () => {
      set({
        payment: {
          selectedMethod: null,
          status: 'idle',
          error: null,
          clientSecret: null
        },
        paymentModal: {
          isOpen: false,
          iframeUrl: '',
          provider: undefined
        }
      });
    },

    // Nouvelle action pour définir le mode
    setMode: (mode: 'standard' | 'express') => {
      set({ mode });
      // Mettre à jour les métadonnées pour refléter le mode
      const currentOrderData = get().orderData;
      set({
        orderData: {
          ...currentOrderData,
          metadata: {
            ...currentOrderData.metadata,
            flags: {
              ...(currentOrderData.metadata?.flags || {}),
              mode: mode,
              expressMode: mode === 'express',
              standardMode: mode === 'standard'
            }
          }
        }
      });
    },

    cleanup: () => {
      const state = get();
      if (state.sessionId) {
        chatService.cleanup(state.sessionId);
      }
      set(initialState);
    }
  };
});