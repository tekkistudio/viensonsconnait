// src/features/product/components/ProductChat/components/ChatMessage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType, Product, ConversationStep, MessageType } from '@/types/chat';
import { useChatContext } from '@/features/product/context/ChatContext';
import { ChatService } from '@/services/ChatService';
import { FormattedText } from '@/components/ui/FormattedText';
import QuantitySelector from './QuantitySelector';
import ProductRecommendation from './ProductRecommendation';
import TimeDisplay from './TimeDisplay';
import { useChatStore } from '@/stores/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

// Helper pour garantir que nextStep est un ConversationStep valide
const ensureValidStep = (step?: string): ConversationStep | undefined => {
  if (!step) return undefined;
  
  // Liste complète des étapes valides pour la vérification
  const validSteps: string[] = [
    'initial', 'description', 'testimonials', 'game_rules',
    'collect_quantity', 'collect_name', 'collect_phone', 'check_existing',
    'collect_city', 'collect_address', 'collect_email_opt', 'collect_email',
    'collect_has_email', 'process_email_response', 'recommend_products',
    'select_product', 'additional_quantity', 'add_product_choice',
    'add_other_products', 'add_notes', 'save_note', 'order_summary',
    'payment_method', 'payment_processing', 'payment_complete', 'payment_error',
    'create_account', 'create_account_email', 'create_account_password',
    'post_purchase', 'contact_info', 'confirm_address', 'update_address',
    'confirm_existing_info', 'process_quantity'
  ];
  
  // Retourner le step s'il est valide, sinon undefined
  return validSteps.includes(step) ? step as ConversationStep : undefined;
};

const getProductIdFromContext = (metadata?: any): string | null => {
  if (!metadata) return null;

  // Essayer d'abord productContext
  if (metadata.productContext) {
    try {
      const context = typeof metadata.productContext === 'string' 
        ? JSON.parse(metadata.productContext)
        : metadata.productContext;
      
      if (context.productId) {
        return context.productId;
      }
    } catch (e) {
      console.warn('Error parsing product context:', e);
    }
  }

  // Essayer ensuite orderData
  if (metadata.orderData?.metadata?.productId) {
    return metadata.orderData.metadata.productId;
  }

  // Essayer selectedProductId
  if (metadata.selectedProductId) {
    return metadata.selectedProductId;
  }

  // Essayer directement dans metadata
  if (metadata.productId) {
    return metadata.productId;
  }

  return null;
};

// Vérifier si un message contient une question sur la quantité
const messageContainsQuantityQuestion = (content: any): boolean => {
  if (!content) return false;
  
  // Si c'est une chaîne de caractères, recherche simple
  if (typeof content === 'string') {
    return content.toLowerCase().includes("combien d'exemplaires") || 
           content.toLowerCase().includes("quantité") ||
           content.toLowerCase().includes("choisissez la quantité");
  }
  
  // Si c'est un objet avec propriété text (comme BaseMessageContent)
  if (typeof content === 'object' && content !== null && 'text' in content) {
    const text = (content as { text: string }).text;
    return typeof text === 'string' && (
      text.toLowerCase().includes("combien d'exemplaires") ||
      text.toLowerCase().includes("quantité") ||
      text.toLowerCase().includes("choisissez la quantité")
    );
  }
  
  // Pour les autres types (React.ReactNode, etc.)
  try {
    const contentStr = String(content);
    return contentStr.toLowerCase().includes("combien d'exemplaires") || 
           contentStr.toLowerCase().includes("quantité") ||
           contentStr.toLowerCase().includes("choisissez la quantité");
  } catch (e) {
    return false;
  }
};

const orderedChoices = [
  'Je veux en savoir plus',
  'Je veux l\'acheter maintenant',
  'Je veux voir les témoignages',
  'Comment y jouer ?'
];

export default function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const { handleUserChoice, handleQuantityModification } = useChatContext();
  const [quantity, setQuantity] = useState(1);
  // AJOUT : État pour gérer le traitement des clics
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Référence pour suivre si le sélecteur a été affiché pour ce message
  const quantitySelectorDisplayed = useRef(false);

  // Effet pour marquer le message comme ayant affiché le sélecteur
  useEffect(() => {
    if (shouldShowQuantitySelector() && !quantitySelectorDisplayed.current) {
      quantitySelectorDisplayed.current = true;
      
      // Mettre à jour le flag dans les métadonnées du message
      if (message.metadata) {
        message.metadata.flags = {
          ...(message.metadata.flags || {}),
          quantitySelectorDisplayed: true
        };
      }
    }
  }, [message]);

  const sortedChoices = message.choices ? [...message.choices].sort((a, b) => {
    const indexA = orderedChoices.indexOf(a);
    const indexB = orderedChoices.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  }) : [];

  const handleQuantityUpdate = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  // Déterminer si on doit afficher le sélecteur de quantité
  const shouldShowQuantitySelector = () => {
    // Si ce n'est pas un message de l'assistant, ne pas afficher
    if (message.type !== 'assistant') return false;
    
    // Si le sélecteur a déjà été affiché pour ce message, ne pas afficher à nouveau
    if (quantitySelectorDisplayed.current) return false;
    
    // Si le message contient déjà une question sur la quantité, ne pas afficher de sélecteur séparé
    if (messageContainsQuantityQuestion(message.content)) return false;
    
    // Garantir que nextStep est un ConversationStep valide
    const nextStep = ensureValidStep(message.metadata?.nextStep);
    
    // Vérifier les flags qui indiquent que le sélecteur a déjà été affiché ou traité
    const alreadyHandled = 
      message.metadata?.flags?.quantitySelectorDisplayed === true ||
      message.metadata?.flags?.quantityHandled === true;
    
    // Afficher uniquement si on est à l'étape collect_quantity et pas encore traité
    return (nextStep === 'collect_quantity' && !alreadyHandled);
  };

  // Fonction de rendu du contenu avec logique pour éviter les doublons
  const renderContent = () => {
    // Si nous sommes à l'étape collect_quantity et que le message contient déjà la question
    if (message.type === 'assistant' && 
        ensureValidStep(message.metadata?.nextStep) === 'collect_quantity' &&
        message.content !== null &&
        typeof message.content === 'string' && 
        messageContainsQuantityQuestion(message.content) &&
        !message.metadata?.flags?.quantityHandled) {
      
      // Si la question de quantité est tout le contenu du message, afficher un message générique
      if (message.content.trim() === "Parfait ! Combien d'exemplaires souhaitez-vous commander ?") {
        return <FormattedText text="Choisissez la quantité désirée :" className="text-[15px]" />;
      }
      
      // Sinon, extraire la partie qui n'est pas la question de quantité
      const parts = message.content.split(/(?:Parfait !|Combien d'exemplaires souhaitez-vous commander \?)/);
      const filteredContent = parts.filter(part => part.trim().length > 0).join(' ');
      
      if (filteredContent) {
        return <FormattedText text={filteredContent} className="text-[15px]" />;
      }
      
      return <p className="text-[15px]">Choisissez la quantité désirée :</p>;
    }
    
    // Cas par défaut: rendu normal du contenu
    if (message.content === null) {
      return null;
    }
    
    if (typeof message.content === 'string') {
      return <FormattedText text={message.content} className="text-[15px]" />;
    }
    
    // Gérer le cas où le contenu est un objet avec une propriété text
    if (message.content && typeof message.content === 'object' && 'text' in message.content) {
      const textContent = message.content.text;
      if (typeof textContent === 'string') {
        return <FormattedText text={textContent} className="text-[15px]" />;
      }
    }
    
    // Fallback pour les autres cas
    try {
      const contentStr = typeof message.content === 'object' 
        ? JSON.stringify(message.content) 
        : String(message.content);
      return <FormattedText text={contentStr} className="text-[15px]" />;
    } catch (e) {
      console.error('Error rendering message content:', e);
      return <p className="text-[15px]">Contenu non affichable</p>;
    }
  };

  const handleQuantityConfirm = async (confirmedQuantity: number) => {
    try {
      console.log('Confirming quantity:', confirmedQuantity);
      
      // Marquer immédiatement le sélecteur comme traité pour éviter les doubles soumissions
      quantitySelectorDisplayed.current = true;
      
      // Montrer un indicateur de chargement
      useChatStore.getState().setTyping(true);
      
      // Récupérer le sessionId et l'état actuel de orderData
      const sessionId = useChatStore.getState().sessionId;
      const currentOrderData = useChatStore.getState().orderData;
      
      if (!sessionId) {
        console.error('Session ID not found');
        useChatStore.getState().setTyping(false);
        return;
      }
      
      // Créer un message utilisateur avec des flags explicites
      const userMessage = {
        type: 'user' as MessageType,
        content: confirmedQuantity.toString(),
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            isQuantitySelection: true,
            quantityConfirmed: true
          }
        }
      };
      
      console.log('Setting purchase flow flags:', userMessage.metadata.flags);
      
      // Ajouter le message utilisateur au store (interface utilisateur)
      useChatStore.getState().addMessage(userMessage);
      
      // Préparer orderData avec les flags appropriés
      const updatedOrderData = {
        ...currentOrderData,
        metadata: {
          ...(currentOrderData.metadata || {}),
          flags: {
            ...(currentOrderData.metadata?.flags || {}),
            inPurchaseFlow: true,
            preventAIIntervention: true,
            quantityStep: true
          }
        }
      };
      
      // Mettre à jour le store
      useChatStore.getState().updateOrderData(updatedOrderData);
      
      // Utiliser le ChatService pour traiter la quantité
      try {
        const chatService = ChatService.create();
        
        // Informer explicitement le service que nous sommes dans un flow d'achat
        const response = await chatService.handleQuantityConfirmation(
          sessionId,
          confirmedQuantity,
          updatedOrderData
        );
        
        if (response) {
          // S'assurer que les flags sont préservés dans la réponse
          if (!response.metadata) {
            response.metadata = {
              flags: {
                inPurchaseFlow: true,
                preventAIIntervention: true
              }
            };
          } else if (!response.metadata.flags) {
            response.metadata.flags = {
              inPurchaseFlow: true,
              preventAIIntervention: true
            };
          } else {
            response.metadata.flags.inPurchaseFlow = true;
            response.metadata.flags.preventAIIntervention = true;
          }
          
          // Ajouter la réponse au store
          useChatStore.getState().addMessage(response);
        }
      } catch (error) {
        console.error('Error confirming quantity:', error);
        
        // Message d'erreur convivial
        useChatStore.getState().addMessage({
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors de la mise à jour de la quantité. Veuillez réessayer.",
          timestamp: new Date().toISOString(),
          assistant: message.assistant,
          choices: ["Réessayer"],
          metadata: {
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          }
        });
      } finally {
        // Masquer l'indicateur de chargement
        useChatStore.getState().setTyping(false);
      }
    } catch (error) {
      console.error('Unhandled error in handleQuantityConfirm:', error);
      useChatStore.getState().setTyping(false);
    }
  };

  const handleProductSelect = async (product: Product) => {
    try {
      // Récupérer le sessionId directement depuis le store
      const sessionId = useChatStore.getState().sessionId;
      
      if (!sessionId) {
        console.error('Session ID not found in store');
        // Fallback à la méthode précédente
        handleUserChoice(`Je veux aussi acheter ${product.name}`);
        return;
      }
      
      console.log('Calling handleAddProductButtonClick with:', {
        sessionId,
        productId: product.id,
        productName: product.name
      });
      
      // Appeler directement la méthode du ChatService
      const chatService = ChatService.create();
      const responses = await chatService.handleAddProductButtonClick(
        sessionId,
        product.id,
        product.name
      );
      
      // Si des réponses sont retournées, les afficher
      if (responses && responses.length > 0) {
        // Ajouter chaque message avec un délai pour l'animation
        setTimeout(() => {
          responses.forEach(response => {
            useChatStore.getState().addMessage(response);
          });
        }, 300);
      }
    } catch (error) {
      console.error('Error in handleProductSelect:', error);
      // Fallback à la méthode précédente
      handleUserChoice(`Je veux aussi acheter ${product.name}`);
    }
  };

  // Fonction pour gérer les clics sur les boutons de choix
  const handleChoiceClick = async (choice: string) => {
    // Éviter les soumissions multiples
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      // Pour le choix du mode express/standard
      if (choice.includes("Commander rapidement") || choice.includes("Être guidé")) {
        console.log('Flow choice button clicked:', choice);
        
        const isExpressMode = choice.includes("rapidement");
        
        // Créer UN SEUL message utilisateur
        const userMessage = {
          type: 'user' as MessageType,
          content: choice,
          timestamp: new Date().toISOString(),
        };
        
        // Ajouter directement le message au store (sans sendMessage)
        useChatStore.getState().addMessage(userMessage);
        
        // Mise à jour du mode
        useChatStore.getState().setMode(isExpressMode ? 'express' : 'standard');
        
        // Appeler handleFlowChoice directement au lieu de sendMessage
        const chatService = ChatService.create();
        if (chatService.handleFlowChoice) {
          const sessionId = useChatStore.getState().sessionId;
          const currentOrderData = useChatStore.getState().orderData;
          
          const responses = await chatService.handleFlowChoice(
            sessionId,
            choice,
            currentOrderData
          );
          
          // Ajouter manuellement les réponses au store
          for (const response of responses) {
            useChatStore.getState().addMessage(response);
          }
        } else {
          // Fallback si handleFlowChoice n'est pas disponible
          await useChatStore.getState().sendMessage(choice);
        }
      }
      else if (choice === "Je veux l'acheter maintenant") {
        // Créer directement un message utilisateur
        const userMessage = {
          type: 'user' as MessageType,
          content: choice,
          timestamp: new Date().toISOString()
        };
        
        // Ajouter directement au store
        useChatStore.getState().addMessage(userMessage);
        
        try {
          // Appeler directement le service
          const chatService = ChatService.create();
          const sessionId = useChatStore.getState().sessionId;
          const response = await chatService.handlePurchaseInitiation(sessionId, 'choose_flow');
          
          if (response) {
            useChatStore.getState().addMessage(response);
          }
        } catch (initError) {
          console.error('Error in purchase initiation:', initError);
          // Fallback
          await useChatStore.getState().sendMessage(choice);
        }
      } 
      else {
        // Traitement normal pour les autres choix
        handleUserChoice(choice);
      }
    } catch (error) {
      console.error('Error handling choice click:', error);
      // Fallback
      handleUserChoice(choice);
    } finally {
      // Important: remettre isProcessing à false avec un petit délai
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  return (
    <div className={`flex w-full flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`${message.type === 'user' ? 'ml-12' : 'mr-8'} max-w-[85%]`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`relative p-4 ${
            message.type === 'user'
              ? 'bg-[#FF7E93] text-white rounded-[20px] rounded-tr-sm'
              : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm shadow-sm'
          }`}
        >
          {message.type === 'assistant' && message.assistant && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-[#132D5D]">
                {message.assistant.name}
              </span>
              <span className="text-sm px-2 py-0.5 bg-[#F0F2F5] text-gray-600 rounded-full">
                {message.assistant.title}
              </span>
            </div>
          )}

          {renderContent()}

          {shouldShowQuantitySelector() && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm">
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={handleQuantityUpdate}
                  onConfirm={handleQuantityConfirm}
                  maxQuantity={message.metadata?.maxQuantity || 10}
                />
              </div>
            </div>
          )}

          {message.metadata?.recommendations && message.metadata.recommendations.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.metadata.recommendations.map((recommendation, index) => {
                if (typeof recommendation === 'string') return null;

                const price = typeof recommendation.price === 'string' 
                  ? parseFloat(recommendation.price) 
                  : recommendation.price ?? 0;

                const productInfo = {
                  id: recommendation.productId,
                  name: recommendation.name,
                  price: Number(price),
                  imageUrl: recommendation.imageUrl || '/images/placeholder.jpg'
                };

                return (
                  <ProductRecommendation
                    key={index}
                    product={productInfo}
                    reason={recommendation.reason}
                    onSelect={handleProductSelect}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-1 px-2">
            <TimeDisplay 
              timestamp={message.timestamp}
              isUserMessage={message.type === 'user'}
            />
          </div>
        </motion.div>

        {message.type === 'assistant' && sortedChoices.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {sortedChoices.map((choice, index) => {
              const isPurchaseButton = choice.includes('acheter');
              
              return (
                <button
                  key={index}
                  onClick={() => handleChoiceClick(choice)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-full
                    transition-all duration-200
                    ${isPurchaseButton 
                      ? 'bg-[#FF7E93] text-white hover:bg-[#FF7E93]/90' 
                      : 'bg-white text-[#FF7E93] border border-[#FF7E93] hover:bg-[#FF7E93]/10'
                    }
                    hover:scale-[1.02] active:scale-95
                  `}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}