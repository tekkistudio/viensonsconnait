// src/hooks/useChatInitialization.ts - CORRIGÉ SELON VOTRE CHATSTORE
import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { WelcomeMessageService } from '@/lib/services/WelcomeMessageService';
import type { ProductData } from '@/types/chat';

interface UseChatInitializationProps {
  product: ProductData;
  storeId: string;
  isDesktop?: boolean;
  autoInitialize?: boolean;
}

export function useChatInitialization({
  product,
  storeId,
  isDesktop = false,
  autoInitialize = true
}: UseChatInitializationProps) {
  // ✅ UTILISER LES BONNES PROPRIÉTÉS DU STORE ACTUEL
  const { 
    messages, 
    addMessage, 
    sessionId, 
    flags,
    clearSession, // ✅ Utiliser clearSession au lieu de clearMessages
    initializeSession, // ✅ Utiliser initializeSession existant
    updateFlags
  } = useChatStore();

  const welcomeService = WelcomeMessageService.getInstance();

  // ✅ VÉRIFIER SI LE CHAT EST INITIALISÉ
  const isInitialized = flags.isInitialized;

  /**
   * ✅ INITIALISE LE CHAT AVEC LE MESSAGE D'ACCUEIL
   */
  const initializeChat = useCallback(async () => {
    try {
      console.log('🚀 Initializing chat for product:', product.name);
      
      // 1. Vérifier si le chat est déjà initialisé avec des messages
      if (isInitialized && messages.length > 0) {
        console.log('✅ Chat already initialized with', messages.length, 'messages');
        return;
      }

      // 2. Initialiser la session (cela va créer un sessionId si nécessaire)
      initializeSession(product.id, storeId);

      // 3. Attendre un petit moment pour que l'initialisation se termine
      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. Si on a déjà des messages après l'initialisation, ne pas ajouter le message d'accueil
      const currentState = useChatStore.getState();
      if (currentState.messages.length > 0) {
        console.log('✅ Messages already exist after initialization');
        updateFlags({ isInitialized: true });
        return;
      }

      // 5. Générer le message d'accueil approprié
      let welcomeMessage;
      if (isDesktop) {
        welcomeMessage = welcomeService.generateDesktopWelcomeMessage(
          product.name || 'Le Jeu Pour les Couples',
          currentState.sessionId,
          product.id || '',
          product.price,
          product.reviewCount
        );
      } else {
        welcomeMessage = welcomeService.generateWelcomeMessage(
          product.name || 'Le Jeu Pour les Couples',
          currentState.sessionId,
          product.id || ''
        );
      }

      // 6. Ajouter le message d'accueil
      addMessage(welcomeMessage);
      
      // 7. Marquer comme initialisé
      updateFlags({ isInitialized: true });
      
      console.log('✅ Chat initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      
      // Message d'erreur de secours
      const errorMessage = {
        type: 'assistant' as const,
        content: `😅 **Oups ! Une petite erreur s'est produite.**

Bonjour ! Je suis Rose, votre Assistante d'achat.

Comment puis-je vous aider avec **${product.name || 'nos jeux'}** ?`,
        choices: [
          'Je veux l\'acheter maintenant',
          'J\'ai des questions à poser',
          'Je veux en savoir plus'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'initial_engagement' as any,
          productId: product.id || '',
          flags: { isErrorRecovery: true }
        },
        timestamp: new Date().toISOString()
      };
      
      addMessage(errorMessage);
      updateFlags({ isInitialized: true });
    }
  }, [
    product, 
    storeId, 
    isDesktop, 
    isInitialized,
    messages.length,
    initializeSession,
    addMessage, 
    updateFlags,
    welcomeService
  ]);

  /**
   * ✅ RÉINITIALISE LE CHAT (pour changer de produit par exemple)
   */
  const resetChat = useCallback(async () => {
    console.log('🔄 Resetting chat...');
    
    clearSession();
    
    // Attendre un moment puis réinitialiser
    setTimeout(() => {
      initializeChat();
    }, 100);
  }, [clearSession, initializeChat]);

  /**
   * ✅ EFFET D'INITIALISATION AUTOMATIQUE
   */
  useEffect(() => {
    if (autoInitialize && product.id && !isInitialized) {
      console.log('🎯 Auto-initializing chat...');
      initializeChat();
    }
  }, [autoInitialize, product.id, isInitialized, initializeChat]);

  /**
   * ✅ EFFET DE NETTOYAGE LORS DU CHANGEMENT DE PRODUIT
   */
  useEffect(() => {
    // Si le produit change, réinitialiser le chat
    if (product.id && isInitialized && messages.length > 0) {
      const firstMessage = messages[0];
      const currentProductId = firstMessage?.metadata?.productId;
      
      if (currentProductId && currentProductId !== product.id) {
        console.log('🔄 Product changed, resetting chat...');
        resetChat();
      }
    }
  }, [product.id, isInitialized, messages, resetChat]);

  return {
    isInitialized,
    initializeChat,
    resetChat,
    sessionId,
    messagesCount: messages.length
  };
}

// ✅ VERSION SIMPLIFIÉE POUR UNE UTILISATION RAPIDE
export function useQuickChatInit(product: ProductData, storeId: string, isDesktop = false) {
  return useChatInitialization({
    product,
    storeId,
    isDesktop,
    autoInitialize: true
  });
}