// src/components/chat/AIMobileChatContainer.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, MicOff, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AIChatIntegrationService } from '@/lib/services/AIChatIntegrationService';
import type { ChatMessage } from '@/types/chat';

interface AIMobileChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  sessionId: string;
  className?: string;
}

export default function AIMobileChatContainer({
  isOpen,
  onClose,
  productId,
  sessionId,
  className = ''
}: AIMobileChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [chatService] = useState(() => AIChatIntegrationService.getInstance());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialiser la conversation quand le chat s'ouvre
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen, sessionId, productId]);

  // Auto-scroll vers le bas
  useEffect(() => {
    scrollToBottom();
  }, [messages, showTyping]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const welcomeMessage = await chatService.initializeConversation(
        sessionId,
        productId,
        { source: 'mobile_chat', timestamp: new Date().toISOString() }
      );
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      setMessages([createErrorMessage()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim();
    if (!messageContent || isLoading) return;

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      type: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowTyping(true);

    try {
      // Simuler un délai de réflexion de l'IA
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      
      const aiResponse = await chatService.processUserMessage(
        sessionId,
        messageContent,
        productId
      );

      setShowTyping(false);
      setMessages(prev => [...prev, aiResponse]);

      // Traiter les actions spéciales dans la réponse
      if (aiResponse.metadata?.externalLinks) {
        handleExternalLinks(aiResponse.metadata.externalLinks);
      }

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      setShowTyping(false);
      setMessages(prev => [...prev, createErrorMessage()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonChoice = async (choice: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setShowTyping(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));
      
      const response = await chatService.processButtonChoice(
        sessionId,
        choice,
        productId
      );

      setShowTyping(false);
      setMessages(prev => [...prev, response]);

    } catch (error) {
      console.error('❌ Erreur choix bouton:', error);
      setShowTyping(false);
      setMessages(prev => [...prev, createErrorMessage()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    if (isListening) {
      // Arrêter l'écoute
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Démarrer l'écoute
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

    const handleExternalLinks = (links: any) => {
    // Gérer les liens externes (WhatsApp, App Store, etc.)
    if (links?.whatsappUrl) {
        // Ouvrir WhatsApp dans un nouvel onglet après un délai
        setTimeout(() => {
        window.open(links.whatsappUrl, '_blank');
        }, 1500);
    }
    
    if (links?.appStore || links?.playStore) {
        // Détecter la plateforme et ouvrir le bon store
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const url = isIOS ? links.appStore : links.playStore;
        
        if (url) {
        setTimeout(() => {
            window.open(url, '_blank');
        }, 1500);
        }
    }
    };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createErrorMessage = (): ChatMessage => ({
    type: 'assistant',
    content: `😔 **Une erreur est survenue**

Désolée, je n'ai pas pu traiter votre demande.

📞 **Contact direct :**
WhatsApp : +221 78 136 27 28`,
    choices: ['🔄 Réessayer', '📞 WhatsApp'],
    assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
    timestamp: new Date().toISOString()
  });

  const formatMessageContent = (content: string) => {
    // Convertir le markdown en JSX simple
    return content
      .split('\n')
      .map((line, index) => {
        // Titres gras
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <div key={index} className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {line.slice(2, -2)}
            </div>
          );
        }
        
        // Lignes avec émojis et texte gras
        const boldMatch = line.match(/\*\*(.*?)\*\*/g);
        if (boldMatch) {
          let formattedLine = line;
          boldMatch.forEach(match => {
            const boldText = match.slice(2, -2);
            formattedLine = formattedLine.replace(match, `<strong>${boldText}</strong>`);
          });
          
          return (
            <div 
              key={index} 
              className="mb-1 text-gray-800 dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: formattedLine }}
            />
          );
        }
        
        // Lignes normales
        if (line.trim()) {
          return (
            <div key={index} className="mb-1 text-gray-800 dark:text-gray-200">
              {line}
            </div>
          );
        }
        
        return <div key={index} className="mb-2" />;
      });
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">R</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Rose</h3>
              <p className="text-white/80 text-sm">Assistante d'Achat</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant="default" 
            className="bg-white/20 text-white border-white/30"
          >
            En ligne
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-auto'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {/* Contenu du message */}
              <div className="text-sm leading-relaxed">
                {message.type === 'user' ? (
                  message.content
                ) : (
                  formatMessageContent(message.content)
                )}
              </div>

              {/* Boutons de choix */}
              {message.choices && message.choices.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.choices.map((choice, choiceIndex) => (
                    <Button
                      key={choiceIndex}
                      variant="outline"
                      size="sm"
                      onClick={() => handleButtonChoice(choice)}
                      disabled={isLoading}
                      className={`w-full text-left justify-start text-sm py-2 px-3 ${
                        message.type === 'user'
                          ? 'border-white/30 text-white hover:bg-white/20'
                          : 'border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      {choice}
                    </Button>
                  ))}
                </div>
              )}

              {/* Liens externes */}
                {message.metadata?.externalLinks && (
                <div className="mt-3 space-y-2">
                    {message.metadata.externalLinks.whatsappUrl && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                        const url = message.metadata?.externalLinks?.whatsappUrl;
                        if (url) window.open(url, '_blank');
                        }}
                        className="w-full flex items-center justify-center space-x-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Ouvrir WhatsApp</span>
                    </Button>
                    )}
                </div>
                )}

              {/* Timestamp */}
              <div className={`text-xs mt-2 opacity-70 ${
                message.type === 'user' ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Indicateur de frappe */}
        {showTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Rose écrit...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Tapez votre message..."
              disabled={isLoading}
              className="pr-12 py-3 rounded-full border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500"
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                isListening 
                  ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' 
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="rounded-full w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Suggestions rapides */}
        {messages.length <= 2 && !isLoading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              '🎮 Comment ça marche ?',
              '💰 Quel est le prix ?',
              '🚚 Infos livraison',
              '📱 Application mobile'
            ].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage(suggestion)}
                className="text-xs rounded-full border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}