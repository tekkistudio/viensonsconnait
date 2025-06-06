// src/components/TestChat.tsx
// Composant simple pour tester le nouveau système sans conflits

'use client';

import React, { useState, useEffect } from 'react';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import type { ChatMessage } from '@/types/chat';

interface TestChatProps {
  productId: string;
  productName: string;
  productPrice: number;
}

export default function TestChat({ productId, productName, productPrice }: TestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `test-${Date.now()}`);

  const optimizedService = OptimizedChatService.getInstance();

  // Initialiser avec un message de bienvenue
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      type: 'assistant',
      content: `👋 Salut ! Je suis Rose, votre assistante d\'achat pour **${productName}** (${productPrice.toLocaleString()} FCFA).\n\n✨ Que voulez-vous faire ?`,
      choices: ['⚡ Acheter maintenant', '❓ Poser une question'],
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat',
      },
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  }, [productName, productPrice]);

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    setIsLoading(true);

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      type: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      let response: ChatMessage;

      if (messageContent.includes('Acheter maintenant')) {
        // Test du flow express
        response = await optimizedService.startExpressPurchase(sessionId, productId);
      } else {
        // Test du traitement de message normal
        response = await optimizedService.processUserInput(sessionId, messageContent);
      }

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Erreur:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: '😔 Désolée, une erreur est survenue. Réessayons !',
        choices: ['🔄 Réessayer'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat',
        },
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceClick = (choice: string) => {
    handleSendMessage(choice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
    setInput('');
  };

  return (
    <div className="max-w-md mx-auto border rounded-lg shadow-lg bg-white">
      {/* En-tête */}
      <div className="bg-[#FF7E93] text-white p-4 rounded-t-lg">
        <h3 className="font-semibold">Chat Test - Rose</h3>
        <p className="text-sm opacity-90">Nouveau système conversationnel</p>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-[#FF7E93] text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {/* Contenu du message */}
              <div className="whitespace-pre-line text-sm">
                {message.content}
              </div>

              {/* Boutons de choix */}
              {message.choices && message.choices.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.choices.map((choice, choiceIndex) => (
                    <button
                      key={choiceIndex}
                      onClick={() => handleChoiceClick(choice)}
                      disabled={isLoading}
                      className="w-full text-left p-2 bg-white text-[#FF7E93] border border-[#FF7E93] rounded hover:bg-[#FF7E93] hover:text-white transition-colors disabled:opacity-50 text-sm"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-2 text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#FF7E93] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#FF7E93] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-[#FF7E93] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez votre message..."
            disabled={isLoading}
            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF7E93] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-[#FF7E93] text-white rounded hover:bg-[#FF7E93]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Envoyer'}
          </button>
        </div>
      </form>

      {/* Debug Info */}
      <div className="p-2 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
        Session: {sessionId} | Messages: {messages.length}
      </div>
    </div>
  );
}