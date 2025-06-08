// src/features/product/components/ProductChat/ChatContainer.tsx 
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import DynamicContentService from '@/lib/services/DynamicContentService';
import { SessionManager } from '@/lib/services/SessionManager';
import ChatMessage from './components/ChatMessage';
import ChatChoices from './components/ChatChoices';
import TypingIndicator from './components/TypingIndicator';
import ChatHeader from './components/ChatHeader';
import QuantitySelector from './components/QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import { supabase } from '@/lib/supabase';

interface ChatContainerProps {
  product: Product;
  storeId: string;
  isMobile?: boolean;
  isFullscreen?: boolean;
}

const ChatContainer = ({ 
  product,
  storeId,
  isMobile = false, 
  isFullscreen = false 
}: ChatContainerProps) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [optimizedService] = useState(() => OptimizedChatService.getInstance());
  const [dynamicContentService] = useState(() => DynamicContentService.getInstance());
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomeMessageAdded, setWelcomeMessageAdded] = useState(false);

  const store = useChatStore();
  
  const {
    messages = [],
    orderData = {},
    sessionId = '',
    isTyping = false,
    payment = {
      status: 'idle' as const,
      error: null,
      clientSecret: null,
      selectedMethod: null
    },
    paymentModal = {
      isOpen: false,
      iframeUrl: '',
      provider: undefined
    },
    addMessage,
    initializeSession,
    updateTypingStatus,
    setExpressMode,
    updateOrderData,
    setPaymentModal,
    isExpressMode = false,
    currentStep = null,
    flags = {
      hasError: false,
      stockReserved: false,
      orderCompleted: false,
      paymentInitiated: false,
      isInitialized: false
    }
  } = store;

  // ✅ FONCTION CORRIGÉE: Service de contenu dynamique avec type 'target'
  const getProductInfoFromDatabase = useCallback(async (infoType: 'description' | 'benefits' | 'usage' | 'testimonials' | 'target') => {
    try {
      return await dynamicContentService.getProductInfo(product.id, infoType);
    } catch (error) {
      console.error('Error fetching product info:', error);
      return `Informations sur le **${product.name}** (données par défaut)`;
    }
  }, [product.id, product.name, dynamicContentService]);

  // ✅ FONCTION: Récupérer les infos de livraison
  const getDeliveryInfoFromDatabase = useCallback(async () => {
    try {
      return await dynamicContentService.getDeliveryInfo();
    } catch (error) {
      console.error('Error fetching delivery info:', error);
      return null;
    }
  }, [dynamicContentService]);

  // ✅ CORRECTION: Initialisation du chat avec SessionManager
  useEffect(() => {
    if (!product?.id || welcomeMessageAdded) return;

    const initializeChat = async () => {
      try {
        console.log('🖥️ Initializing desktop chat session:', { productId: product.id, storeId });
        
        const currentMessages = useChatStore.getState().messages;
        if (currentMessages.length > 0) {
          console.log('📝 Desktop chat already has messages, skipping initialization');
          setIsInitialized(true);
          return;
        }

        // ✅ CORRECTION: Utiliser SessionManager pour créer session
        const newSessionId = await sessionManager.getOrCreateSession(product.id, storeId);
        console.log('🆕 Desktop session created with SessionManager:', newSessionId);

        if (initializeSession) {
          initializeSession(product.id, storeId, newSessionId);
          setIsInitialized(true);
          
          setTimeout(() => {
            const latestMessages = useChatStore.getState().messages;
            
            if (latestMessages.length === 0 && !welcomeMessageAdded) {
              const welcomeMessage: ChatMessageType = {
                type: 'assistant',
                content: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.

Je vois que vous vous intéressez à notre jeu **${product.name}** !

✨ Je peux vous aider à :
- **Commander rapidement** (moins de 60 secondes)
- **Répondre à vos questions**
- **Vous conseiller** sur l'utilisation

Que souhaitez-vous faire ?`,
                choices: [
                  '⚡ Commander rapidement',
                  '❓ Poser une question',
                  '📦 Infos livraison',
                  '💬 En savoir plus le jeu'
                ],
                assistant: {
                  name: 'Rose',
                  title: 'Assistante d\'achat',
                  avatar: undefined
                },
                metadata: {
                  nextStep: 'initial_engagement' as ConversationStep,
                  productId: product.id,
                  sessionId: newSessionId,
                  flags: { 
                    isWelcome: true,
                    preventAIIntervention: true
                  }
                },
                timestamp: new Date().toISOString()
              };
              
              console.log('📝 Adding welcome message to desktop chat');
              addMessage(welcomeMessage);
              setWelcomeMessageAdded(true);
            }
          }, 500);
        }
        
      } catch (err) {
        console.error('❌ Error initializing desktop chat:', err);
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, [product.id, storeId, welcomeMessageAdded, sessionManager, initializeSession, addMessage]);

  // ✅ Auto-scroll optimisé
  useEffect(() => {
    if (chatRef.current) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, showTyping]);

  // ✅ FONCTION CORRIGÉE: Gérer les messages standards avec données dynamiques
  const handleStandardMessages = async (content: string): Promise<ChatMessageType> => {
    if (content.includes('Poser une question') || content.includes('❓')) {
      return {
        type: 'assistant',
        content: `🤔 **Parfait !** Posez-moi toutes vos questions sur le jeu **${product.name}**.

Je peux vous expliquer :
- Comment ça fonctionne
- Pour qui c'est adapté
- Les bénéfices pour vous
- Les témoignages clients

Qu'est-ce qui vous intéresse le plus ?`,
        choices: [
          '❓ Comment y jouer ?',
          '👥 C\'est pour qui ?',
          '💝 Quels bénéfices ?',
          '⭐ Avis clients'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'question_mode' as ConversationStep,
          flags: { questionMode: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION DESKTOP: Gestion "Comment y jouer ?" avec vraies données DB
    if (content.includes('Comment y jouer') || content.includes('Comment ça fonctionne')) {
      console.log('🎮 Desktop: Récupération des règles du jeu depuis la base de données');
      
      let gameRules = '';
      
      try {
        // ✅ CORRECTION: Récupération sécurisée depuis la table products
        const { data: productData, error }: { data: any, error: any } = await supabase
          .from('products')
          .select('game_rules, name')
          .eq('id', product.id)  // ✅ product vient des props
          .single();

        if (error || !productData) {
          console.error('❌ Erreur récupération produit:', error);
          gameRules = `❓ **Comment jouer au jeu ${product.name} :**

    Une erreur est survenue lors du chargement des règles. 

    📞 **Contactez-nous pour plus d'informations :**
    • WhatsApp : +221 78 136 27 28
    • Email : contact@viensonseconnait.com

    Nous vous enverrons les règles détaillées !`;
        } else if (productData.game_rules && productData.game_rules.trim()) {
          console.log('✅ Règles du jeu trouvées:', productData.game_rules.substring(0, 100) + '...');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

    ${productData.game_rules}

    🎯 **Prêt(e) à vivre cette expérience ?**`;
        } else {
          console.log('⚠️ Pas de règles définies pour ce produit');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

    📝 **Les règles détaillées de ce jeu seront ajoutées prochainement.**

    En attendant, voici ce que vous devez savoir :
    • Ce jeu est conçu pour renforcer les relations
    • Il se joue en groupe (2 personnes minimum)
    • Chaque partie dure environ 30-60 minutes
    • Aucune préparation spéciale requise

    📞 **Pour les règles complètes, contactez-nous :**
    • WhatsApp : +221 78 136 27 28
    • Email : contact@viensonseconnait.com

    Nous vous enverrons un guide détaillé !`;
        }
      } catch (dbError) {
        console.error('❌ Erreur base de données:', dbError);
        gameRules = `❓ **Comment jouer au jeu ${product.name} :**

    😔 **Problème technique temporaire**

    Nous ne pouvons pas charger les règles du jeu en ce moment.

    📞 **Solution immédiate :**
    • WhatsApp : +221 78 136 27 28
    • Nous vous enverrons les règles par message

    🔄 **Ou réessayez dans quelques minutes**`;
      }

      return {
        type: 'assistant',
        content: gameRules,
        choices: [
          '⚡ Commander maintenant',
          '💝 Quels bénéfices ?',
          '⭐ Voir les avis',
          '📞 Contacter le support'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'game_rules_shown' as ConversationStep,
          flags: {
            gameRulesShown: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    if (content.includes('Quels bénéfices') || content.includes('bénéfices')) {
      const benefitsInfo = await getProductInfoFromDatabase('benefits');
      return {
        type: 'assistant',
        content: benefitsInfo,
        choices: [
          '⚡ Commander maintenant',
          '❓ Comment y jouer ?',
          '⭐ Voir les avis'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'product_benefits' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    if (content.includes('Avis clients') || content.includes('⭐')) {
      const testimonialsInfo = await getProductInfoFromDatabase('testimonials');
      return {
        type: 'assistant',
        content: testimonialsInfo,
        choices: [
          '⚡ Commander maintenant',
          '❓ Comment y jouer ?',
          '💝 Quels bénéfices ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'testimonials_view' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION: Infos livraison dynamiques avec vraies données
    if (content.includes('Infos livraison') || content.includes('📦')) {
      const deliveryInfo = await getDeliveryInfoFromDatabase();
      
      let deliveryContent = `🚚 **Informations de livraison**\n\n`;
      
      if (deliveryInfo && deliveryInfo.zones.length > 0) {
        deliveryContent += `📍 **Zones couvertes :**\n`;
        deliveryInfo.zones.forEach(zone => {
          if (zone.active) {
            const cityName = zone.city || zone.name;
            deliveryContent += `• ${cityName} : ${zone.cost.toLocaleString()} FCFA\n`;
          }
        });
        
        deliveryContent += `\n⏰ **Délais :**\n• ${deliveryInfo.timing}\n\n`;
        deliveryContent += `💰 **Paiement :**\n• Wave\n• Carte bancaire\n• Paiement à la livraison\n\n`;
      } else {
        deliveryContent += `📍 **Zones principales :**\n• Dakar : Gratuit\n• Autres villes Sénégal : 3 000 FCFA\n• Abidjan : 2 500 FCFA\n\n⏰ **Délais :**\n• Livraison sous 24-48h\n\n💰 **Paiement :**\n• Wave\n• Carte bancaire\n• Paiement à la livraison\n\n`;
      }
      
      deliveryContent += `Voulez-vous commander maintenant ?`;

      return {
        type: 'assistant',
        content: deliveryContent,
        choices: [
          '⚡ Commander maintenant',
          '📞 Autres questions',
          '🏠 Ma zone de livraison'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'delivery_info' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION: En savoir plus dynamique avec vraies données
    if (content.includes('En savoir plus') || content.includes('💬')) {
      const descriptionInfo = await getProductInfoFromDatabase('description');
      return {
        type: 'assistant',
        content: descriptionInfo,
        choices: [
          '⚡ Commander maintenant',
          '❓ Comment y jouer ?',
          '⭐ Voir les avis'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'product_info' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // Réponse par défaut
    return {
      type: 'assistant',
      content: `Merci pour votre message ! Comment puis-je vous aider davantage avec le jeu **${product.name}** ?`,
      choices: [
        '⚡ Commander rapidement',
        '❓ Poser une question',
        '📦 Infos livraison'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'initial_engagement' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  };

  // ✅ FONCTION UTILITAIRE: Créer un message d'erreur
  const createErrorResponse = (errorText: string): ChatMessageType => ({
    type: 'assistant',
    content: `😔 ${errorText}`,
    choices: ['🔄 Réessayer', '📞 Contacter le support'],
    assistant: {
      name: 'Rose',
      title: 'Assistante d\'achat'
    },
    metadata: {
      nextStep: 'error_recovery' as ConversationStep,
      flags: { hasError: true }
    },
    timestamp: new Date().toISOString()
  });

  // ✅ FONCTION: Gestion de l'envoi de message
  const handleSubmit = async (contentOrEvent: string | React.MouseEvent<HTMLButtonElement>) => {
    const content = typeof contentOrEvent === 'string' 
      ? contentOrEvent 
      : inputMessage.trim();
  
    if (!content || isProcessing) return;
    
    console.log('📤 Submitting message:', content);
    
    setInputMessage('');
    setIsProcessing(true);
    updateTypingStatus(true);
    
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      updateTypingStatus(false);
      setIsProcessing(false);
    }
  };

  // ✅ FONCTION PRINCIPALE CORRIGÉE: sendMessage pour desktop
  const sendMessage = async (content: string) => {
    try {
      console.log('🖥️ Processing desktop message:', { content, sessionId, isExpressMode, currentStep });
      
      // Ajouter le message utilisateur immédiatement
      const userMessage: ChatMessageType = {
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            isButtonChoice: true,
            preventAIIntervention: true
          }
        }
      };
      
      addMessage(userMessage);

      // Petite pause pour l'animation
      await new Promise(resolve => setTimeout(resolve, 500));

      let response: ChatMessageType;
      
      // ✅ CORRECTION MAJEURE: UTILISER TOUJOURS L'API POUR L'IA
      console.log('🚀 Sending to enhanced chat API...');
      
      try {
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            productId: product.id,
            currentStep: currentStep || 'initial',
            orderData: orderData || {},
            sessionId: sessionId || Date.now().toString(),
            storeId: storeId || 'default'
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`API error: ${apiResponse.status}`);
        }

        const aiResponse = await apiResponse.json();
        console.log('✅ Enhanced API response:', aiResponse);

        response = {
          type: 'assistant',
          content: aiResponse.content || "Je suis là pour vous aider !",
          choices: aiResponse.choices || ["⚡ Commander maintenant", "❓ Poser une question"],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: aiResponse.nextStep || currentStep,
            orderData: aiResponse.orderData,
            flags: aiResponse.flags || {}
          },
          timestamp: new Date().toISOString()
        };

      } catch (apiError) {
        console.error('❌ API call failed:', apiError);
        
        // ✅ FALLBACK: Si l'API échoue, traiter localement
        const isStandardButton = [
          'Poser une question', 'Comment y jouer', 'C\'est pour qui',
          'Quels bénéfices', 'Avis clients', 'Infos livraison', 'En savoir plus'
        ].some(btn => content.includes(btn));
        
        if (isStandardButton) {
          response = await handleStandardMessages(content);
        } else {
          response = createErrorResponse('Problème de connexion. Veuillez réessayer.');
        }
      }
      
      console.log('✅ Desktop response generated:', response);
      addMessage(response);
      
      // Mettre à jour l'état si nécessaire
      if (response.metadata?.orderData) {
        updateOrderData(response.metadata.orderData);
      }
      
    } catch (err) {
      console.error('❌ Error in desktop sendMessage:', err);
      
      const errorMessage = createErrorResponse('Une erreur est survenue. Veuillez réessayer.');
      addMessage(errorMessage);
    }
  };

  // ✅ FONCTION: Gestion des touches clavier
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = inputMessage.trim();
      if (content && !isProcessing) {
        handleSubmit(content);
      }
    }
  };

  // ✅ CORRECTION DESKTOP: handleChoiceSelect avec traitement spécial "Comment y jouer"
    const handleChoiceSelect = async (choice: string) => {
      if (isProcessing) {
        console.log('⏳ Processing in progress, ignoring choice');
        return;
      }

      console.log('🔘 Desktop choice selected:', choice);
      setIsProcessing(true);
      updateTypingStatus(true);
      
      try {
        // ✅ TRAITEMENT SPÉCIAL: Comment y jouer ?
        if (choice.includes('Comment y jouer') || choice === '❓ Comment y jouer ?') {
          console.log('🎮 Desktop: Traitement spécial "Comment y jouer"');
          
          // Ajouter d'abord le message utilisateur
          const userMessage: ChatMessageType = {
            type: 'user',
            content: choice,
            timestamp: new Date().toISOString()
          };
          addMessage(userMessage);
          
          // Attendre un peu pour l'animation
          await new Promise(resolve => setTimeout(resolve, 800));
          
          let gameRules = '';
          
          try {
            // ✅ RÉCUPÉRATION DIRECTE DEPUIS SUPABASE
            const { data: productData, error } = await supabase
              .from('products')
              .select('game_rules, name')
              .eq('id', product.id)
              .single();

            if (error || !productData) {
              console.error('❌ Desktop - Erreur récupération produit:', error);
              gameRules = `❓ **Comment jouer au jeu ${product.name} :**

    Une erreur est survenue lors du chargement des règles. 

    📞 **Contactez-nous pour plus d'informations :**
    • WhatsApp : +221 78 136 27 28
    • Email : contact@viensonseconnait.com

    Nous vous enverrons les règles détaillées !`;
            } else if (productData.game_rules && productData.game_rules.trim()) {
              console.log('✅ Desktop - Règles du jeu trouvées:', productData.game_rules.substring(0, 100) + '...');
              gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

    ${productData.game_rules}

    🎯 **Prêt(e) à vivre cette expérience ?**`;
            } else {
              console.log('⚠️ Desktop - Pas de règles définies pour ce produit');
              gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

    📝 **Les règles détaillées de ce jeu seront ajoutées prochainement.**

    En attendant, voici ce que vous devez savoir :
    • Ce jeu est conçu pour renforcer les relations
    • Il se joue en groupe (2 personnes minimum)
    • Chaque partie dure environ 30-60 minutes
    • Aucune préparation spéciale requise

    📞 **Pour les règles complètes, contactez-nous :**
    • WhatsApp : +221 78 136 27 28
    • Email : contact@viensonseconnait.com

    Nous vous enverrons un guide détaillé !`;
            }
          } catch (dbError) {
            console.error('❌ Desktop - Erreur base de données:', dbError);
            gameRules = `❓ **Comment jouer au jeu ${product.name} :**

    😔 **Problème technique temporaire**

    Nous ne pouvons pas charger les règles du jeu en ce moment.

    📞 **Solution immédiate :**
    • WhatsApp : +221 78 136 27 28
    • Nous vous enverrons les règles par message

    🔄 **Ou réessayez dans quelques minutes**`;
          }
          
          // Créer et ajouter la réponse assistant
          const assistantMessage: ChatMessageType = {
            type: 'assistant',
            content: gameRules,
            choices: [
              '⚡ Commander maintenant',
              '💝 Quels bénéfices ?',
              '⭐ Voir les avis',
              '📞 Contacter le support'
            ],
            assistant: {
              name: 'Rose',
              title: 'Assistante d\'achat'
            },
            metadata: {
              nextStep: 'game_rules_shown' as ConversationStep,
              flags: {
                gameRulesShown: true
              }
            },
            timestamp: new Date().toISOString()
          };
          
          addMessage(assistantMessage);
          return; // ✅ IMPORTANT: Sortir ici pour éviter le double traitement
        }
        
        // ✅ POUR TOUS LES AUTRES CHOIX: Traitement normal
        await sendMessage(choice);
        
      } catch (error) {
        console.error('❌ Error sending desktop choice:', error);
        
        // Message d'erreur en cas de problème
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Erreur temporaire**

    Un problème est survenu. Voulez-vous réessayer ?`,
          choices: ['🔄 Réessayer', '📞 Contacter le support'],
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
        
        addMessage(errorMessage);
        
      } finally {
        updateTypingStatus(false);
        setIsProcessing(false);
      }
    };

  // ✅ FONCTION: Fermeture du modal de paiement
  const handleClosePaymentModal = () => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  };

  // Rendu conditionnel si pas initialisé
  if (!isInitialized) {
    return (
      <div className={`flex flex-col ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'} bg-white rounded-xl overflow-hidden`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
            <p className="text-gray-600">Initialisation du chat...</p>
          </div>
        </div>
      </div>
    );
  }

  const chatContent = (
    <div className={`flex flex-col ${
      isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'
    } bg-white rounded-xl overflow-hidden`}>
      <ChatHeader
        productId={product.id}
        title={`Le Jeu ${product.name}`}
        rating={product.stats?.satisfaction || 5}
        price={`${product.price.toLocaleString()} FCFA`}
        oldPrice={product.compareAtPrice ? `${product.compareAtPrice.toLocaleString()} FCFA` : undefined}
      />

      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.type}-${index}-${message.timestamp}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChatMessage
                message={message}
                isTyping={false}
                onChoiceSelect={handleChoiceSelect}
              />
              
              {/* Gestion sécurisée du sélecteur de quantité */}
              {message.metadata?.showQuantitySelector && !message.metadata?.quantityHandled && (
                <div className="mt-4">
                  <QuantitySelector
                    quantity={1}
                    onQuantityChange={(qty: number) => {
                      if (message.metadata?.handleQuantityChange) {
                        message.metadata.handleQuantityChange(qty);
                      }
                    }}
                    onConfirm={async (qty: number) => {
                      if (message.metadata?.handleQuantitySubmit) {
                        await message.metadata.handleQuantitySubmit(qty);
                        if (message.metadata) {
                          message.metadata.quantityHandled = true;
                        }
                      }
                      handleSubmit(qty.toString());
                    }}
                    maxQuantity={message.metadata?.maxQuantity || 10}
                  />
                </div>
              )}
            </motion.div>
          ))}
          
          {/* Indicateur de frappe avec animation */}
          {(showTyping || isTyping) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="typing-indicator"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zone de saisie avec validation */}
      <div className="bg-white border-t px-4 py-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Tapez votre message..."
            className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
            maxLength={500}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-400 cursor-not-allowed"
              disabled
              title="Reconnaissance vocale (bientôt disponible)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!inputMessage.trim() || isProcessing}
              className={`p-2 transition-colors ${
                inputMessage.trim() && !isProcessing
                  ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={isProcessing ? 'Traitement en cours...' : 'Envoyer le message'}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF7E93] rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals de paiement avec toutes les props obligatoires */}
      <BictorysPaymentModal
        isOpen={paymentModal?.isOpen || false}
        onClose={handleClosePaymentModal}
        amount={orderData?.totalAmount || 0}
        currency="XOF"
        orderId={parseInt(orderData?.session_id || Date.now().toString())}
        customerInfo={{
          name: `${orderData?.first_name || ''} ${orderData?.last_name || ''}`.trim() || 'Client',
          phone: orderData?.phone || '',
          email: orderData?.email || '',
          city: orderData?.city || ''
        }}
      />
      
      {payment?.status === 'processing' && payment?.clientSecret && (
        <StripePaymentModal
          isOpen={stripeModalOpen}
          onClose={() => setStripeModalOpen(false)}
          clientSecret={payment.clientSecret}
        />
      )}
    </div>
  );

  return (
    <ConversationProvider 
      value={{
        productId: product.id,
        sessionId: sessionId,
        storeId,
        customerInfo: {
          firstName: orderData?.first_name || '',
          lastName: orderData?.last_name || '',
          city: orderData?.city || '',
          email: orderData?.email || ''
        }
      }}
    >
      {chatContent}
    </ConversationProvider>
  );
};

export default ChatContainer;