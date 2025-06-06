// src/features/product/components/ProductChat/ProductChat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ShoppingCart, Clock, Check } from 'lucide-react';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, ConversationStep } from '@/types/chat';
import ImprovedChatMessage from './components/ChatMessage';

interface ProductChatProps {
  productId: string;
  productName: string;
  productPrice: number;
  storeId: string;
}

// Composant pour l'indicateur de frappe
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-2 p-4 text-gray-500"
  >
    <div className="flex gap-1">
      <motion.div
        className="w-2 h-2 bg-[#FF7E93] rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-[#FF7E93] rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-[#FF7E93] rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      />
    </div>
    <span className="text-sm">Rose tape...</span>
  </motion.div>
);

// Composant pour les suggestions rapides
const QuickSuggestions = ({ 
  suggestions, 
  onSelect 
}: { 
  suggestions: string[]; 
  onSelect: (suggestion: string) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-wrap gap-2 p-4"
  >
    {suggestions.map((suggestion, index) => (
      <motion.button
        key={index}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect(suggestion)}
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-[#FF7E93] hover:text-white transition-all duration-200"
      >
        {suggestion}
      </motion.button>
    ))}
  </motion.div>
);

// Composant principal du chat
export default function ProductChat({ 
  productId, 
  productName, 
  productPrice, 
  storeId 
}: ProductChatProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [isExpressMode, setIsExpressMode] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const chatStore = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optimizedService = OptimizedChatService.getInstance();

  // Suggestions initiales pour engager la conversation
  const initialSuggestions = [
    "⚡ Acheter maintenant",
    "❓ Poser une question", 
    "📦 Infos livraison",
    "💬 Parler à Rose"
  ];

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatStore.messages]);

  // Initialiser la session au montage
  useEffect(() => {
    if (!sessionStarted) {
      initializeChat();
      setSessionStarted(true);
    }
  }, [productId]);

  const initializeChat = async () => {
    try {
      // Message de bienvenue personnalisé
      const welcomeMessage: ChatMessage = {
        type: 'assistant',
        content: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.\n\nJe vois que vous vous intéressez à notre jeu **${productName}** ! C'est excellent ✨\n\n Je peux :\n• Vous aider à **Commander en express** (moins de 60 secondes)\n• **Répondre à vos questions**\n• **Vous expliquer** comment y jouer\n\nQue souhaitez-vous faire ?`,
        choices: [],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat',
          avatar: undefined
        },
        metadata: {
          nextStep: 'initial_engagement' as ConversationStep,
          productId,
          flags: { isWelcome: true }
        },
        timestamp: new Date().toISOString()
      };

      chatStore.addMessage(welcomeMessage);
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const handleSuggestionSelect = async (suggestion: string) => {
    setShowSuggestions(false);
    setIsTyping(true);

    try {
      if (suggestion.includes('Acheter maintenant')) {
        // Mode express
        setIsExpressMode(true);
        
        // Ajouter le message utilisateur
        chatStore.addMessage({
          type: 'user',
          content: suggestion,
          timestamp: new Date().toISOString()
        });

        // Démarrer le flow express
        const response = await optimizedService.startExpressPurchase(
          chatStore.sessionId,
          productId
        );
        
        setTimeout(() => {
          chatStore.addMessage(response);
          setIsTyping(false);
        }, 1000); // Délai pour simulation de frappe

      } else if (suggestion.includes('Poser une question')) {
        // Mode conversationnel
        chatStore.addMessage({
          type: 'user',
          content: suggestion,
          timestamp: new Date().toISOString()
        });

        const response: ChatMessage = {
          type: 'assistant',
          content: `🤔 **Parfait !** Posez-moi toutes vos questions sur le jeu **${productName}**.\n\nJe peux vous expliquer :\n• Comment ça fonctionne\n• Pour qui c'est adapté\n• Les bénéfices\n• Les témoignages clients\n\nQu'est-ce qui vous intéresse le plus ?`,
          choices: [
            '❓ Comment ça marche ?',
            '👥 C\'est pour qui ?',
            '💝 Quels bénéfices ?',
            '⭐ Avis clients'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat',
            avatar: undefined
          },
          metadata: {
            nextStep: 'question_mode' as ConversationStep,
            productId
          },
          timestamp: new Date().toISOString()
        };

        setTimeout(() => {
          chatStore.addMessage(response);
          setIsTyping(false);
        }, 1000);

      } else if (suggestion.includes('Infos livraison')) {
        // Informations livraison
        chatStore.addMessage({
          type: 'user',
          content: suggestion,
          timestamp: new Date().toISOString()
        });

        const response: ChatMessage = {
          type: 'assistant',
          content: `🚚 **Informations de livraison**\n\n📍 **Zones couvertes :**\n• Dakar et banlieue : 1 000 FCFA\n• Pikine, Guédiawaye : 1 500 FCFA\n• Autres régions : 2 500 FCFA\n\n⏰ **Délais :**\n• Commande avant 15h = Livraison le jour même\n• Sinon livraison sous 24h\n\n💰 **Paiement :**\n• Wave, Orange Money\n• Carte bancaire\n• Espèces à la livraison\n\nVoulez-vous commander maintenant ?`,
          choices: [
            '⚡ Commander maintenant',
            '📞 Autres questions',
            '🏠 Changer d\'adresse'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat',
            avatar: undefined
          },
          metadata: {
            nextStep: 'delivery_info' as ConversationStep,
            productId
          },
          timestamp: new Date().toISOString()
        };

        setTimeout(() => {
          chatStore.addMessage(response);
          setIsTyping(false);
        }, 1000);

      } else {
        // Mode conversation libre
        await handleUserMessage(suggestion);
      }
    } catch (error) {
      console.error('Error handling suggestion:', error);
      setIsTyping(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    if (!message.trim()) return;

    setIsTyping(true);

    try {
      // Ajouter le message utilisateur
      chatStore.addMessage({
        type: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Obtenir la réponse du service
      const response = await optimizedService.processUserInput(
        chatStore.sessionId,
        message,
        chatStore.getLastMetadata()?.nextStep
      );

      // Simuler un délai de frappe
      setTimeout(() => {
        chatStore.addMessage(response);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000); // 1-2 secondes

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorResponse: ChatMessage = {
        type: 'assistant',
        content: '😔 Désolée, j\'ai rencontré un problème. Pouvez-vous réessayer ?',
        choices: ['🔄 Réessayer', '📞 Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat',
          avatar: undefined
        },
        metadata: {
          nextStep: 'error_recovery' as ConversationStep,
          flags: { hasError: true }
        },
        timestamp: new Date().toISOString()
      };

      setTimeout(() => {
        chatStore.addMessage(errorResponse);
        setIsTyping(false);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* En-tête du chat */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#132D5D]">Rose</h3>
              <p className="text-sm text-gray-500">Assistante d'achat VOSC</p>
            </div>
          </div>
          
          {isExpressMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#FF7E93]/10 text-[#FF7E93] rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>Mode Express</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {chatStore.messages.map((message, index) => (
            <ImprovedChatMessage
              key={index}
              message={message}
              isTyping={false}
            />
          ))}
        </AnimatePresence>

        {/* Indicateur de frappe */}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>

        {/* Suggestions rapides */}
        <AnimatePresence>
          {showSuggestions && chatStore.messages.length <= 1 && (
            <QuickSuggestions
              suggestions={initialSuggestions}
              onSelect={handleSuggestionSelect}
            />
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-gray-200 bg-white p-4">
        <ChatInput
          onSendMessage={handleUserMessage}
          disabled={isTyping}
          placeholder="Tapez votre message..."
        />
      </div>

      {/* Informations produit flottantes */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-4 h-4 text-[#FF7E93]" />
          <span className="text-sm font-medium">Produit sélectionné</span>
        </div>
        <h4 className="font-semibold text-sm text-gray-800 mb-1">{productName}</h4>
        <p className="text-lg font-bold text-[#FF7E93]">
          {productPrice.toLocaleString()} FCFA
        </p>
      </motion.div>
    </div>
  );
}

// Composant pour la zone de saisie
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  placeholder: string;
}

function ChatInput({ onSendMessage, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7E93] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
      </div>
      
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="px-4 py-3 bg-[#FF7E93] text-white rounded-xl hover:bg-[#FF7E93]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[48px]"
      >
        {disabled ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </form>
  );
}