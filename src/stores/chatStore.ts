// src/stores/chatStore.ts - VERSION CORRIGÉE ANTI-BOUCLE INFINIE
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage, ConversationStep, ChatOrderData } from '@/types/chat';
import type { PaymentProvider } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';

// ✅ INTERFACES COMPLÈTES
interface PaymentState {
  selectedMethod: PaymentProvider | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  error: string | null;
  clientSecret: string | null;
}

interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentProvider;
}

interface ConversationContext {
  userIntent: 'browsing' | 'interested' | 'considering' | 'ready_to_buy' | 'post_purchase';
  mentionedTopics: string[];
  concerns: string[];
  interests: string[];
  lastUserMessage?: string;
  messageCount: number;
  freeTextEnabled: boolean;
}

interface SessionStats {
  startTime: string;
  lastActivity: string;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageResponseTime?: number;
  sessionDuration: number;
  wasRestored: boolean;
}

interface ChatState {
  // État principal
  sessionId: string;
  messages: ChatMessage[];
  isTyping: boolean;
  currentStep: ConversationStep | null;
  
  // État de commande
  orderData: Partial<ChatOrderData>;
  isExpressMode: boolean;
  
  // États de paiement
  payment: PaymentState;
  paymentModal: PaymentModalState;
  
  // Contexte de conversation élargi
  conversationContext: ConversationContext;
  
  // Statistiques de session
  sessionStats: SessionStats;
  
  // Métadonnées
  productId: string | null;
  storeId: string | null;
  startedAt: string;
  lastActivity: string;
  
  // Flags d'état
  flags: {
    hasError: boolean;
    stockReserved: boolean;
    orderCompleted: boolean;
    paymentInitiated: boolean;
    isInitialized: boolean;
    canAcceptFreeText: boolean;
    showSessionRestored: boolean;
  };

  // Actions
  initializeSession: (productId?: string, storeId?: string, providedSessionId?: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateTypingStatus: (isTyping: boolean) => void;
  setCurrentStep: (step: ConversationStep | null) => void;
  updateOrderData: (data: Partial<ChatOrderData>) => void;
  setExpressMode: (isExpress: boolean) => void;
  updateFlags: (flags: Partial<ChatState['flags']>) => void;
  updateConversationContext: (context: Partial<ConversationContext>) => void;
  addUserConcern: (concern: string) => void;
  addUserInterest: (interest: string) => void;
  updateUserIntent: (intent: ConversationContext['userIntent']) => void;
  setPaymentModal: (modal: PaymentModalState) => void;
  updatePaymentStatus: (payment: Partial<PaymentState>) => void;
  restoreSession: () => void;
  getSessionAge: () => number;
  shouldShowContinueMessage: () => boolean;
  dismissSessionRestored: () => void;
  clearSession: () => void;
  cleanup: () => void;
  getLastMessage: () => ChatMessage | null;
  getLastMetadata: () => ChatMessage['metadata'] | null;
  getUserMessages: () => ChatMessage[];
  getAssistantMessages: () => ChatMessage[];
  resetError: () => void;
  updateActivity: () => void;
}

// Constantes
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 heures
const CONTINUE_MESSAGE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const MAX_STORED_MESSAGES = 100;

// ✅ STORAGE SÉCURISÉ SIMPLIFIÉ
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      const item = window.sessionStorage.getItem(name);
      return item && item !== 'undefined' && item !== 'null' ? item : null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !value || value === 'undefined') return;
      JSON.parse(value); // Validation JSON
      window.sessionStorage.setItem(name, value);
    } catch (error) {
      console.warn(`Storage error for ${name}:`, error);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(name);
      }
    } catch {}
  }
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // État initial
      sessionId: '',
      messages: [],
      isTyping: false,
      currentStep: null,
      orderData: {},
      isExpressMode: false,
      
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
      },
      
      conversationContext: {
        userIntent: 'browsing',
        mentionedTopics: [],
        concerns: [],
        interests: [],
        messageCount: 0,
        freeTextEnabled: true
      },
      
      sessionStats: {
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        sessionDuration: 0,
        wasRestored: false
      },
      
      productId: null,
      storeId: null,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      flags: {
        hasError: false,
        stockReserved: false,
        orderCompleted: false,
        paymentInitiated: false,
        isInitialized: false,
        canAcceptFreeText: true,
        showSessionRestored: false
      },

      // ✅ CORRECTION CRITIQUE: initializeSession sans boucles
      initializeSession: (productId?: string, storeId?: string, providedSessionId?: string) => {
        const state = get();
        const now = new Date().toISOString();
        
        // Vérifier session existante
        const existingSession = state.messages.length > 0;
        const sessionAge = Date.now() - new Date(state.sessionStats.startTime).getTime();
        
        if (existingSession && sessionAge < SESSION_TIMEOUT) {
          console.log('📱 Restoring existing session');
          set({
            productId: productId || state.productId,
            storeId: storeId || state.storeId,
            sessionId: providedSessionId || state.sessionId,
            lastActivity: now,
            flags: { ...state.flags, isInitialized: true }
          });
          return;
        }
        
        // Nouvelle session
        const newSessionId = providedSessionId || uuidv4();
        console.log(`🆕 New chat session: ${newSessionId}`);
        
        set({
          sessionId: newSessionId,
          messages: [],
          isTyping: false,
          currentStep: null,
          orderData: {},
          isExpressMode: false,
          productId: productId || null,
          storeId: storeId || null,
          startedAt: now,
          lastActivity: now,
          conversationContext: {
            userIntent: 'browsing',
            mentionedTopics: [],
            concerns: [],
            interests: [],
            messageCount: 0,
            freeTextEnabled: true
          },
          sessionStats: {
            startTime: now,
            lastActivity: now,
            totalMessages: 0,
            userMessages: 0,
            assistantMessages: 0,
            sessionDuration: 0,
            wasRestored: false
          },
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
          },
          flags: {
            hasError: false,
            stockReserved: false,
            orderCompleted: false,
            paymentInitiated: false,
            isInitialized: true,
            canAcceptFreeText: true,
            showSessionRestored: false
          }
        });
      },

      // ✅ CORRECTION CRITIQUE: addMessage sans condition de re-render
      addMessage: (message: ChatMessage) => {
        if (!message?.content || !message?.type) {
          console.warn('⚠️ Invalid message:', message);
          return;
        }

        set((state) => {
          // Vérifier doublons
          const exists = state.messages.some(
            m => m.timestamp === message.timestamp && m.content === message.content
          );
          
          if (exists) {
            console.log('⚠️ Duplicate message ignored');
            return state; // Retourner l'état actuel sans modification
          }

          console.log('📝 Adding message:', message.type);
          
          const now = new Date().toISOString();
          const isUserMessage = message.type === 'user';
          const newMessages = [...state.messages, message].slice(-MAX_STORED_MESSAGES);
          
          // Construire le nouvel état en une seule fois
          const newState: ChatState = {
            ...state,
            messages: newMessages,
            lastActivity: now,
            sessionStats: {
              ...state.sessionStats,
              lastActivity: now,
              totalMessages: state.sessionStats.totalMessages + 1,
              userMessages: state.sessionStats.userMessages + (isUserMessage ? 1 : 0),
              assistantMessages: state.sessionStats.assistantMessages + (isUserMessage ? 0 : 1)
            },
            conversationContext: {
              ...state.conversationContext,
              messageCount: state.conversationContext.messageCount + (isUserMessage ? 1 : 0),
              lastUserMessage: isUserMessage ? message.content : state.conversationContext.lastUserMessage
            }
          };

          // Appliquer métadonnées si présentes
          if (message.metadata?.nextStep) {
            newState.currentStep = message.metadata.nextStep;
          }
          
          if (message.metadata?.orderData) {
            newState.orderData = { ...state.orderData, ...message.metadata.orderData };
          }
          
          if (message.metadata?.flags) {
            newState.flags = { ...state.flags, ...message.metadata.flags };
            
            if (message.metadata.flags.expressMode !== undefined) {
              newState.isExpressMode = message.metadata.flags.expressMode;
            }
          }

          return newState;
        });
      },

      // Actions simplifiées
      updateTypingStatus: (isTyping: boolean) => 
        set(state => state.isTyping !== isTyping ? { 
          isTyping, 
          lastActivity: new Date().toISOString() 
        } : state),

      setCurrentStep: (step: ConversationStep | null) => 
        set(state => state.currentStep !== step ? { 
          currentStep: step, 
          lastActivity: new Date().toISOString() 
        } : state),

      updateOrderData: (data: Partial<ChatOrderData>) => 
        set(state => ({ 
          orderData: { ...state.orderData, ...data },
          lastActivity: new Date().toISOString()
        })),

      setExpressMode: (isExpress: boolean) => 
        set(state => state.isExpressMode !== isExpress ? {
          isExpressMode: isExpress,
          lastActivity: new Date().toISOString()
        } : state),

      updateFlags: (flags: Partial<ChatState['flags']>) => 
        set(state => ({
          flags: { ...state.flags, ...flags },
          lastActivity: new Date().toISOString()
        })),

      updateConversationContext: (context: Partial<ConversationContext>) => 
        set(state => ({
          conversationContext: { ...state.conversationContext, ...context },
          lastActivity: new Date().toISOString()
        })),

      addUserConcern: (concern: string) => 
        set(state => {
          if (state.conversationContext.concerns.includes(concern)) return state;
          return {
            conversationContext: {
              ...state.conversationContext,
              concerns: [...state.conversationContext.concerns, concern]
            },
            lastActivity: new Date().toISOString()
          };
        }),

      addUserInterest: (interest: string) => 
        set(state => {
          if (state.conversationContext.interests.includes(interest)) return state;
          return {
            conversationContext: {
              ...state.conversationContext,
              interests: [...state.conversationContext.interests, interest]
            },
            lastActivity: new Date().toISOString()
          };
        }),

      updateUserIntent: (intent: ConversationContext['userIntent']) => 
        set(state => ({
          conversationContext: { ...state.conversationContext, userIntent: intent },
          lastActivity: new Date().toISOString()
        })),

      setPaymentModal: (modal: PaymentModalState) => 
        set({ paymentModal: modal, lastActivity: new Date().toISOString() }),

      updatePaymentStatus: (payment: Partial<PaymentState>) => 
        set(state => ({
          payment: { ...state.payment, ...payment },
          lastActivity: new Date().toISOString()
        })),

      restoreSession: () => 
        set(state => ({
          sessionStats: {
            ...state.sessionStats,
            wasRestored: true,
            lastActivity: new Date().toISOString()
          },
          flags: { ...state.flags, showSessionRestored: true }
        })),

      getSessionAge: () => {
        const state = get();
        return Date.now() - new Date(state.sessionStats.startTime).getTime();
      },

      shouldShowContinueMessage: () => {
        const state = get();
        const timeSinceLastActivity = Date.now() - new Date(state.sessionStats.lastActivity).getTime();
        return timeSinceLastActivity > CONTINUE_MESSAGE_THRESHOLD && state.messages.length > 0;
      },

      dismissSessionRestored: () => 
        set(state => ({ flags: { ...state.flags, showSessionRestored: false } })),

      cleanup: () => 
        set(state => ({ flags: { ...state.flags, isInitialized: false } })),

      clearSession: () => {
        const now = new Date().toISOString();
        set({
          sessionId: uuidv4(),
          messages: [],
          isTyping: false,
          currentStep: null,
          orderData: {},
          isExpressMode: false,
          startedAt: now,
          lastActivity: now,
          conversationContext: {
            userIntent: 'browsing',
            mentionedTopics: [],
            concerns: [],
            interests: [],
            messageCount: 0,
            freeTextEnabled: true
          },
          sessionStats: {
            startTime: now,
            lastActivity: now,
            totalMessages: 0,
            userMessages: 0,
            assistantMessages: 0,
            sessionDuration: 0,
            wasRestored: false
          },
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
          },
          flags: {
            hasError: false,
            stockReserved: false,
            orderCompleted: false,
            paymentInitiated: false,
            isInitialized: false,
            canAcceptFreeText: true,
            showSessionRestored: false
          }
        });
      },

      getLastMessage: () => {
        const state = get();
        return state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
      },

      getLastMetadata: () => {
        const lastMessage = get().getLastMessage();
        return lastMessage?.metadata || null;
      },

      getUserMessages: () => get().messages.filter(msg => msg.type === 'user'),
      getAssistantMessages: () => get().messages.filter(msg => msg.type === 'assistant'),
      
      resetError: () => 
        set(state => ({
          flags: { ...state.flags, hasError: false },
          lastActivity: new Date().toISOString()
        })),

      updateActivity: () => 
        set({ lastActivity: new Date().toISOString() })
    }),
    {
      name: 'vosc-chat-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages.slice(-MAX_STORED_MESSAGES),
        currentStep: state.currentStep,
        orderData: state.orderData,
        isExpressMode: state.isExpressMode,
        productId: state.productId,
        storeId: state.storeId,
        startedAt: state.startedAt,
        lastActivity: state.lastActivity,
        conversationContext: state.conversationContext,
        sessionStats: { ...state.sessionStats, wasRestored: false },
        flags: { ...state.flags, isInitialized: false, showSessionRestored: false },
        payment: state.payment,
        paymentModal: { ...state.paymentModal, isOpen: false }
      }),
      version: 4
    }
  )
);

// Hooks utilitaires
export const useChatConversation = () => {
  const store = useChatStore();
  return {
    canAcceptFreeText: store.flags.canAcceptFreeText,
    userIntent: store.conversationContext.userIntent,
    concerns: store.conversationContext.concerns,
    interests: store.conversationContext.interests,
    messageCount: store.conversationContext.messageCount,
    lastUserMessage: store.conversationContext.lastUserMessage,
    updateContext: store.updateConversationContext,
    addConcern: store.addUserConcern,
    addInterest: store.addUserInterest,
    updateIntent: store.updateUserIntent
  };
};

export const useChatSession = () => {
  const store = useChatStore();
  return {
    sessionId: store.sessionId,
    isActive: store.messages.length > 0,
    duration: store.sessionStats.sessionDuration,
    messageCount: store.sessionStats.totalMessages,
    lastActivity: store.sessionStats.lastActivity,
    isInitialized: store.flags.isInitialized,
    wasRestored: store.sessionStats.wasRestored,
    shouldShowContinue: store.shouldShowContinueMessage(),
    showSessionRestored: store.flags.showSessionRestored,
    dismissRestored: store.dismissSessionRestored
  };
};

export default useChatStore;