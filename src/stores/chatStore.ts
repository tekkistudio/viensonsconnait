// src/stores/chatStore.ts - VERSION CORRIGÉE AVEC PROTECTION JSON
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage, ConversationStep, ChatOrderData } from '@/types/chat';
import type { PaymentProvider } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParse, safeJsonStringify, protectedSessionStorageGet, protectedLocalStorageSet } from '@/lib/utils/json-safety'; // ✅ NOUVEAU

// ✅ INTERFACES COMPLÈTES CORRIGÉES
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

  // Actions avec types stricts
  initializeSession: (productId?: string, storeId?: string, providedSessionId?: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateTypingStatus: (isTyping: boolean) => void;
  setCurrentStep: (step: ConversationStep | null) => void;
  updateOrderData: (data: Partial<ChatOrderData>) => void;
  setExpressMode: (isExpress: boolean) => void;
  updateFlags: (flags: Partial<ChatState['flags']>) => void;
  
  // Actions pour contexte de conversation
  updateConversationContext: (context: Partial<ConversationContext>) => void;
  addUserConcern: (concern: string) => void;
  addUserInterest: (interest: string) => void;
  updateUserIntent: (intent: ConversationContext['userIntent']) => void;
  
  // Actions de paiement
  setPaymentModal: (modal: PaymentModalState) => void;
  updatePaymentStatus: (payment: Partial<PaymentState>) => void;
  
  // Actions de session avancées
  restoreSession: () => void;
  getSessionAge: () => number;
  shouldShowContinueMessage: () => boolean;
  dismissSessionRestored: () => void;
  
  // Actions utilitaires
  clearSession: () => void;
  cleanup: () => void;
  getLastMessage: () => ChatMessage | null;
  getLastMetadata: () => ChatMessage['metadata'] | null;
  getUserMessages: () => ChatMessage[];
  getAssistantMessages: () => ChatMessage[];
  resetError: () => void;
  updateActivity: () => void;
}

// Constantes pour la gestion de session
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 heures
const CONTINUE_MESSAGE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const MAX_STORED_MESSAGES = 100;

// ✅ CORRECTION: Storage sécurisé avec protection JSON
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const item = window.sessionStorage.getItem(name);
      if (!item || item === 'undefined' || item === 'null') {
        return null;
      }
      
      return item;
    } catch (error) {
      console.warn(`⚠️ Storage getItem error for ${name}:`, error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      
      // Valider que c'est du JSON valide avant de sauvegarder
      if (value && value !== 'undefined' && value !== 'null') {
        JSON.parse(value); // Test de validation
        window.sessionStorage.setItem(name, value);
      }
    } catch (error) {
      console.warn(`⚠️ Storage setItem error for ${name}:`, error);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.removeItem(name);
    } catch (error) {
      console.warn(`⚠️ Storage removeItem error for ${name}:`, error);
    }
  }
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // État initial
      sessionId: uuidv4(),
      messages: [],
      isTyping: false,
      currentStep: null,
      orderData: {},
      isExpressMode: false,
      
      // États de paiement initialisés
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
      
      // Contexte de conversation initial
      conversationContext: {
        userIntent: 'browsing',
        mentionedTopics: [],
        concerns: [],
        interests: [],
        messageCount: 0,
        freeTextEnabled: true
      },
      
      // Statistiques de session initiales
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

      // ✅ CORRECTION: initializeSession avec gestion d'erreur JSON
      initializeSession: (productId?: string, storeId?: string, providedSessionId?: string) => {
        try {
          const state = get();
          const now = new Date().toISOString();
          
          // Vérifier si une session existe déjà
          const existingSession = state.messages.length > 0;
          const sessionAge = Date.now() - new Date(state.sessionStats.startTime).getTime();
          
          // Gestion intelligente de la reprise de session
          if (existingSession && sessionAge < SESSION_TIMEOUT) {
            console.log('📱 Session existante détectée, restauration...', {
              sessionAge: Math.floor(sessionAge / 1000 / 60),
              messageCount: state.messages.length
            });
            
            set({
              productId: productId || state.productId,
              storeId: storeId || state.storeId,
              sessionId: providedSessionId || state.sessionId,
              lastActivity: now,
              sessionStats: {
                ...state.sessionStats,
                wasRestored: true,
                lastActivity: now
              },
              flags: {
                ...state.flags,
                isInitialized: true,
                showSessionRestored: sessionAge > CONTINUE_MESSAGE_THRESHOLD
              }
            });
            
            return;
          }
          
          if (sessionAge >= SESSION_TIMEOUT) {
            console.log('⏰ Session expirée, création d\'une nouvelle session');
          }
          
          // Utiliser sessionId fourni ou générer nouveau
          const newSessionId = providedSessionId || uuidv4();
          console.log(`🆕 Initializing new chat session: ${newSessionId}`);
          
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
        } catch (error) {
          console.error('❌ Error in initializeSession:', error);
          // Fallback minimal en cas d'erreur
          set({
            sessionId: uuidv4(),
            flags: { ...get().flags, isInitialized: true, hasError: true }
          });
        }
      },

      // ✅ CORRECTION: addMessage avec validation JSON
      addMessage: (message: ChatMessage) => {
        try {
          const state = get();
          const now = new Date().toISOString();
          
          // Validation du message
          if (!message || !message.content || !message.type) {
            console.warn('⚠️ Invalid message structure:', message);
            return;
          }
          
          // Éviter les doublons
          const messageExists = state.messages.some(
            m => m.timestamp === message.timestamp && m.content === message.content
          );
          
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping duplicate');
            return;
          }

          console.log('📝 Adding message:', message.type, message.content.substring(0, 50) + '...');
          
          set((currentState) => {
            const newMessages = [...currentState.messages, message];
            const limitedMessages = newMessages.slice(-MAX_STORED_MESSAGES);
            
            // Mise à jour des statistiques
            const isUserMessage = message.type === 'user';
            const newStats: SessionStats = {
              ...currentState.sessionStats,
              lastActivity: now,
              totalMessages: currentState.sessionStats.totalMessages + 1,
              userMessages: currentState.sessionStats.userMessages + (isUserMessage ? 1 : 0),
              assistantMessages: currentState.sessionStats.assistantMessages + (isUserMessage ? 0 : 1),
              sessionDuration: Date.now() - new Date(currentState.sessionStats.startTime).getTime()
            };
            
            // Analyse du contexte conversationnel
            let updatedContext: ConversationContext = { ...currentState.conversationContext };
            
            if (isUserMessage) {
              updatedContext.messageCount += 1;
              updatedContext.lastUserMessage = message.content;
              
              // Analyse automatique des intentions
              const content = message.content.toLowerCase();
              
              if (content.includes('intéresse') || content.includes('aime')) {
                updatedContext.userIntent = 'interested';
              }
              
              if (content.includes('cher') || content.includes('prix') || content.includes('doute')) {
                if (!updatedContext.concerns.includes('price_concern')) {
                  updatedContext.concerns.push('price_concern');
                }
              }
              
              if (content.includes('acheter') || content.includes('commander') || content.includes('prendre')) {
                updatedContext.userIntent = 'ready_to_buy';
              }
            }

            // Construction d'état explicite
            const newState: ChatState = {
              ...currentState,
              messages: limitedMessages,
              lastActivity: now,
              sessionStats: newStats,
              conversationContext: updatedContext
            };

            // Mise à jour conditionnelle des métadonnées
            if (message.metadata?.nextStep && message.metadata.nextStep !== currentState.currentStep) {
              newState.currentStep = message.metadata.nextStep;
            }

            if (message.metadata?.orderData) {
              newState.orderData = {
                ...currentState.orderData,
                ...message.metadata.orderData
              };
            }

            if (message.metadata?.flags) {
              const updatedFlags = { ...currentState.flags };
              let flagsChanged = false;
              
              if (message.metadata.flags.expressMode !== undefined && 
                  message.metadata.flags.expressMode !== currentState.isExpressMode) {
                newState.isExpressMode = message.metadata.flags.expressMode;
              }
              
              Object.entries(message.metadata.flags).forEach(([key, value]) => {
                if (key in updatedFlags && (updatedFlags as any)[key] !== value) {
                  (updatedFlags as any)[key] = value;
                  flagsChanged = true;
                }
              });
              
              if (flagsChanged) {
                newState.flags = updatedFlags;
              }
            }

            return newState;
          });
        } catch (error) {
          console.error('❌ Error in addMessage:', error);
          // Ne pas faire échouer l'ajout du message
        }
      },

      // Actions pour le contexte de conversation
      updateConversationContext: (context: Partial<ConversationContext>) => {
        set((state) => ({
          conversationContext: { ...state.conversationContext, ...context },
          lastActivity: new Date().toISOString()
        }));
      },

      addUserConcern: (concern: string) => {
        set((state) => {
          const concerns = [...state.conversationContext.concerns];
          if (!concerns.includes(concern)) {
            concerns.push(concern);
          }
          return {
            conversationContext: { ...state.conversationContext, concerns },
            lastActivity: new Date().toISOString()
          };
        });
      },

      addUserInterest: (interest: string) => {
        set((state) => {
          const interests = [...state.conversationContext.interests];
          if (!interests.includes(interest)) {
            interests.push(interest);
          }
          return {
            conversationContext: { ...state.conversationContext, interests },
            lastActivity: new Date().toISOString()
          };
        });
      },

      updateUserIntent: (intent: ConversationContext['userIntent']) => {
        set((state) => ({
          conversationContext: { ...state.conversationContext, userIntent: intent },
          lastActivity: new Date().toISOString()
        }));
      },

      // Actions de session avancées
      restoreSession: () => {
        const state = get();
        console.log('🔄 Restoring session with context:', state.conversationContext);
        
        set({
          sessionStats: {
            ...state.sessionStats,
            wasRestored: true,
            lastActivity: new Date().toISOString()
          },
          flags: {
            ...state.flags,
            showSessionRestored: true
          }
        });
      },

      getSessionAge: () => {
        const state = get();
        return Date.now() - new Date(state.sessionStats.startTime).getTime();
      },

      shouldShowContinueMessage: () => {
        const state = get();
        const timeSinceLastActivity = Date.now() - new Date(state.sessionStats.lastActivity).getTime();
        return timeSinceLastActivity > CONTINUE_MESSAGE_THRESHOLD && state.messages.length > 0;
      },

      dismissSessionRestored: () => {
        set((state) => ({
          flags: { ...state.flags, showSessionRestored: false }
        }));
      },

      updateTypingStatus: (isTyping: boolean) => {
        const state = get();
        if (state.isTyping !== isTyping) {
          set({
            isTyping,
            lastActivity: new Date().toISOString()
          });
        }
      },

      setCurrentStep: (step: ConversationStep | null) => {
        const state = get();
        if (state.currentStep !== step) {
          set({
            currentStep: step,
            lastActivity: new Date().toISOString()
          });
        }
      },

      updateOrderData: (data: Partial<ChatOrderData>) => {
        set((state) => ({
          orderData: { ...state.orderData, ...data },
          lastActivity: new Date().toISOString()
        }));
      },

      setExpressMode: (isExpress: boolean) => {
        const state = get();
        if (state.isExpressMode !== isExpress) {
          console.log(`🚀 Express mode: ${isExpress ? 'ENABLED' : 'DISABLED'}`);
          set({
            isExpressMode: isExpress,
            lastActivity: new Date().toISOString()
          });
        }
      },

      updateFlags: (flags: Partial<ChatState['flags']>) => {
        set((state) => ({
          flags: { ...state.flags, ...flags },
          lastActivity: new Date().toISOString()
        }));
      },

      setPaymentModal: (modal: PaymentModalState) => {
        set({
          paymentModal: modal,
          lastActivity: new Date().toISOString()
        });
      },

      updatePaymentStatus: (payment: Partial<PaymentState>) => {
        set((state) => ({
          payment: { ...state.payment, ...payment },
          lastActivity: new Date().toISOString()
        }));
      },

      cleanup: () => {
        console.log('🧹 Cleaning up chat session');
        set((state) => ({
          flags: {
            ...state.flags,
            isInitialized: false
          }
        }));
      },

      clearSession: () => {
        const now = new Date().toISOString();
        console.log('🗑️ Clearing chat session');
        
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
        return state.messages.length > 0 
          ? state.messages[state.messages.length - 1] 
          : null;
      },

      getLastMetadata: () => {
        const lastMessage = get().getLastMessage();
        return lastMessage?.metadata || null;
      },

      getUserMessages: () => {
        const state = get();
        return state.messages.filter(msg => msg.type === 'user');
      },

      getAssistantMessages: () => {
        const state = get();
        return state.messages.filter(msg => msg.type === 'assistant');
      },

      resetError: () => {
        set((state) => ({
          flags: { ...state.flags, hasError: false },
          lastActivity: new Date().toISOString()
        }));
      },

      updateActivity: () => {
        set({
          lastActivity: new Date().toISOString()
        });
      }
    }),
    {
      name: 'vosc-chat-storage',
      storage: createJSONStorage(() => safeStorage), // ✅ CORRECTION: Utiliser le storage sécurisé
      partialize: (state) => {
        try {
          return {
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
            sessionStats: {
              ...state.sessionStats,
              wasRestored: false
            },
            flags: {
              ...state.flags,
              isInitialized: false,
              showSessionRestored: false
            },
            payment: state.payment,
            paymentModal: {
              ...state.paymentModal,
              isOpen: false
            }
          };
        } catch (error) {
          console.error('❌ Error in partialize:', error);
          return {};
        }
      },
      version: 4,
      migrate: (persistedState: any, version: number) => {
        try {
          console.log(`🔄 Migrating chat store from version ${version} to 4`);
          
          if (version < 4) {
            return {
              ...persistedState,
              conversationContext: {
                userIntent: 'browsing',
                mentionedTopics: [],
                concerns: [],
                interests: [],
                messageCount: persistedState.messages?.length || 0,
                freeTextEnabled: true,
                ...(persistedState.conversationContext || {})
              },
              sessionStats: {
                startTime: persistedState.startedAt || new Date().toISOString(),
                lastActivity: persistedState.lastActivity || new Date().toISOString(),
                totalMessages: persistedState.messages?.length || 0,
                userMessages: persistedState.messages?.filter((m: any) => m.type === 'user').length || 0,
                assistantMessages: persistedState.messages?.filter((m: any) => m.type === 'assistant').length || 0,
                sessionDuration: 0,
                wasRestored: true,
                ...(persistedState.sessionStats || {})
              },
              flags: {
                hasError: false,
                stockReserved: false,
                orderCompleted: false,
                paymentInitiated: false,
                isInitialized: false,
                canAcceptFreeText: true,
                showSessionRestored: true,
                ...(persistedState.flags || {})
              }
            };
          }
          return persistedState;
        } catch (error) {
          console.error('❌ Error in migrate:', error);
          return {};
        }
      },
      // ✅ AJOUT: Gestion des erreurs de persistance
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('✅ Chat store hydrated successfully');
        } else {
          console.warn('⚠️ Chat store hydration failed, using defaults');
        }
      }
    }
  )
);

// Hooks utilitaires pour questions libres
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

export const useChatProgress = () => {
  const store = useChatStore();
  
  const progressSteps = [
    'initial_engagement',
    'express_contact', 
    'express_address', 
    'express_payment', 
    'order_complete'
  ];
  
  const currentStepIndex = store.currentStep 
    ? progressSteps.indexOf(store.currentStep)
    : -1;
    
  const progress = currentStepIndex >= 0 
    ? ((currentStepIndex + 1) / progressSteps.length) * 100 
    : 0;

  return {
    currentStep: store.currentStep,
    progress,
    stepIndex: currentStepIndex,
    totalSteps: progressSteps.length,
    isComplete: store.flags.orderCompleted
  };
};

// Sélecteurs optimisés
export const selectChatMessages = (state: ChatState) => state.messages;
export const selectIsTyping = (state: ChatState) => state.isTyping;
export const selectCurrentStep = (state: ChatState) => state.currentStep;
export const selectOrderData = (state: ChatState) => state.orderData;
export const selectIsExpressMode = (state: ChatState) => state.isExpressMode;
export const selectFlags = (state: ChatState) => state.flags;
export const selectPayment = (state: ChatState) => state.payment;
export const selectPaymentModal = (state: ChatState) => state.paymentModal;
export const selectConversationContext = (state: ChatState) => state.conversationContext;

export default useChatStore;