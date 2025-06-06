// src/features/product/context/ChatContext.tsx - VERSION CORRIGÉE

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import type { ChatMessage, ConversationStep } from '@/types/chat';
import type { Product } from '@/types/product';

interface ChatContextType {
  // État du chat
  messages: ChatMessage[];
  isTyping: boolean;
  currentStep: ConversationStep | null;
  isExpressMode: boolean;
  
  // Actions
  sendMessage: (message: string) => Promise<void>;
  startExpressPurchase: () => Promise<void>;
  initializeChat: () => Promise<void>;
  
  // Données produit
  product: Product;
  
  // Gestion des erreurs
  error: string | null;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: React.ReactNode;
  product: Product;
}

export function ChatProvider({ children, product }: ChatProviderProps) {
  const chatStore = useChatStore();
  const [error, setError] = useState<string | null>(null);
  const [optimizedService] = useState(() => OptimizedChatService.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialiser le chat au montage
  useEffect(() => {
    if (!isInitialized && product.id) {
      initializeChat();
      setIsInitialized(true);
    }
  }, [product.id, isInitialized]);

  const initializeChat = async () => {
    try {
      setError(null);
      
      // Vérifier si le chat est déjà initialisé
      if (chatStore.messages.length > 0) {
        console.log('Chat déjà initialisé, pas de nouveau message de bienvenue');
        return;
      }
      
      // Initialiser une nouvelle session
      chatStore.initializeSession(product.id, 'a9563f88-217c-4998-b080-ed39f637ea31');
      
      // Message de bienvenue
      const welcomeMessage: ChatMessage = {
        type: 'assistant',
        content: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.\n\nJe vois que vous vous intéressez à notre jeu **${product.name}** ! C'est excellent ✨\n\n  Je peux :\n• Vous aider à **commander rapidement** (moins de 60 secondes)\n• **Répondre à vos questions**\n• **Vous expliquer** comment y jouer\n\nQue souhaitez-vous faire ?`,
        choices: [
          '⚡ Commander rapidement',
          '❓ Poser une question',
          '📦 Infos livraison',
          '💬 En savoir plus'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat',
          avatar: undefined
        },
        metadata: {
          nextStep: 'initial_engagement' as ConversationStep,
          flags: { 
            isWelcome: true,
            preventAIIntervention: true
          }
        },
        timestamp: new Date().toISOString()
      };

      chatStore.addMessage(welcomeMessage);
      
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Erreur lors de l\'initialisation du chat');
    }
  };

  const sendMessage = async (message: string) => {
    try {
      setError(null);
      chatStore.updateTypingStatus(true);

      // Ajouter le message utilisateur
      const userMessage: ChatMessage = {
        type: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      chatStore.addMessage(userMessage);

      // Déterminer le type de réponse
      let response: ChatMessage;
      
      // Si c'est un choix pour le mode express
      if (message.includes('Commander rapidement') || message.includes('⚡')) {
        // ✅ CORRECTION: Utiliser startExpressPurchase au lieu de handleExpressPurchase
        response = await optimizedService.startExpressPurchase(
          chatStore.sessionId,
          product.id
        );
        chatStore.setExpressMode(true);
      } else if (chatStore.isExpressMode && chatStore.currentStep?.includes('express')) {
        // ✅ CORRECTION: Utiliser processUserInput pour les étapes express
        response = await optimizedService.processUserInput(
          chatStore.sessionId,
          message,
          chatStore.currentStep
        );
      } else {
        // ✅ CORRECTION: Utiliser processUserInput pour les autres messages
        response = await optimizedService.processUserInput(
          chatStore.sessionId,
          message,
          chatStore.currentStep || 'initial'
        );
      }

      // Ajouter la réponse
      chatStore.addMessage(response);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erreur lors de l\'envoi du message');
      
      // Message d'erreur de secours
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Je suis désolée, une erreur est survenue. Veuillez réessayer.',
        choices: ['Réessayer', 'Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'error_recovery' as ConversationStep,
          flags: { hasError: true }
        },
        timestamp: new Date().toISOString()
      };
      
      chatStore.addMessage(errorMessage);
    } finally {
      chatStore.updateTypingStatus(false);
    }
  };

  const startExpressPurchase = async () => {
    try {
      setError(null);
      chatStore.setExpressMode(true);
      
      // ✅ CORRECTION: Utiliser startExpressPurchase
      const response = await optimizedService.startExpressPurchase(
        chatStore.sessionId,
        product.id
      );
      
      chatStore.addMessage(response);
      
    } catch (err) {
      console.error('Error starting express purchase:', err);
      setError('Erreur lors du démarrage de l\'achat express');
    }
  };

  const clearError = () => {
    setError(null);
    chatStore.resetError();
  };

  const contextValue: ChatContextType = {
    // État du chat
    messages: chatStore.messages,
    isTyping: chatStore.isTyping,
    currentStep: chatStore.currentStep,
    isExpressMode: chatStore.isExpressMode,
    
    // Actions
    sendMessage,
    startExpressPurchase,
    initializeChat,
    
    // Données produit
    product,
    
    // Gestion des erreurs
    error,
    clearError
  };

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

export default ChatContext;