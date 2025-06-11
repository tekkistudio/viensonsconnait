// src/features/product/components/ProductChat/components/MobileChatContainer.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Star, Mic, Send, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutContext } from '@/core/context/LayoutContext';
import { useChatStore } from '@/stores/chatStore';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import DynamicContentService from '@/lib/services/DynamicContentService';
import { SessionManager } from '@/lib/services/SessionManager';
import TypingIndicator from './TypingIndicator';
import ChatMessage from './ChatMessage';
import ChatChoices from './ChatChoices';
import QuantitySelector from './QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import type { RealTimeStats } from '@/types/product';
import { supabase } from '@/lib/supabase';

interface MobileChatContainerProps {
  product: Product;
  storeId: string;
  onBackClick: () => void;
}

const MobileChatContainer: React.FC<MobileChatContainerProps> = ({
  product,
  storeId,
  onBackClick
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const { setHideHeaderGroup } = useLayoutContext();
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [optimizedService] = useState(() => OptimizedChatService.getInstance());
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(product.stats?.satisfaction || 5);
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);

  const store = useChatStore();
  
  const {
    messages = [],
    orderData = {},
    sessionId = '',
    isTyping = false,
    payment = {
      status: 'idle' as const,
      error: null,
      clientSecret: null
    },
    paymentModal = {
      isOpen: false,
      iframeUrl: '',
      provider: undefined
    },
    initializeSession,
    addMessage,
    updateTypingStatus,
    setPaymentModal = () => {},
    cleanup,
    setExpressMode,
    updateOrderData,
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

  // ✅ CORRECTION: Initialisation avec SessionManager
  useEffect(() => {
    let isMounted = true;

    const initializeChat = async () => {
      if (!product?.id || !isMounted || welcomeMessageSent) return;

      try {
        console.log('📱 Initializing mobile chat session:', { productId: product.id, storeId });
        
        const currentMessages = useChatStore.getState().messages;
        if (currentMessages.length > 0) {
          console.log('📝 Mobile chat already has messages, skipping welcome message');
          setIsInitialized(true);
          setWelcomeMessageSent(true);
          return;
        }

        if (isInitialized) {
          console.log('📝 Mobile chat already initializing, skipping');
          return;
        }

        setIsInitialized(true);

        // ✅ CORRECTION: Utiliser SessionManager pour créer session
        const newSessionId = await sessionManager.getOrCreateSession(product.id, storeId);
        console.log('🆕 Session created with SessionManager:', newSessionId);

        if (initializeSession) {
          initializeSession(product.id, storeId, newSessionId);
        }
        
        setTimeout(() => {
          if (!isMounted || welcomeMessageSent) return;
          
          const latestMessages = useChatStore.getState().messages;
          
          if (latestMessages.length === 0) {
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
                '💬 En savoir plus sur le jeu'
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
            
            console.log('📝 Adding welcome message to mobile chat');
            addMessage(welcomeMessage);
            setWelcomeMessageSent(true);
          } else {
            setWelcomeMessageSent(true);
          }
        }, 300);
        
      } catch (error) {
        console.error('❌ Error initializing mobile chat:', error);
        setIsInitialized(true);
      }
    };

    initializeChat();
    
    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [product.id, storeId, welcomeMessageSent, isInitialized, sessionManager, initializeSession, addMessage, cleanup]);

  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, [setHideHeaderGroup]);

  // Chargement des statistiques
  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      try {
        const [statsResult, reviewsCount, averageRating] = await Promise.all([
          productStatsService.getProductStats(product.id),
          testimonialsService.getTestimonialsCountByProduct(product.id),
          testimonialsService.getAverageRating(product.id)
        ]);

        if (!isSubscribed) return;

        setStats({
          viewsCount: statsResult.totalViews || 0,
          salesCount: statsResult.sold || 0,
          reviewsCount: reviewsCount || 0
        });

        if (averageRating > 0) {
          setRating(averageRating);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    if (product.id) {
      initializeStats();
      productStatsService.incrementViewCount(product.id);
    }

    return () => {
      isSubscribed = false;
    };
  }, [product.id]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, showTyping]);

  // Service de contenu dynamique
  const [dynamicContentService] = useState(() => DynamicContentService.getInstance());

  const getProductInfoFromDatabase = useCallback(async (infoType: 'description' | 'benefits' | 'usage' | 'testimonials' | 'target') => {
    try {
      return await dynamicContentService.getProductInfo(product.id, infoType);
    } catch (error) {
      console.error('Error fetching product info:', error);
      return `Informations sur le **${product.name}** (données par défaut)`;
    }
  }, [product.id, product.name, dynamicContentService]);

  const getDeliveryInfoFromDatabase = useCallback(async () => {
    try {
      return await dynamicContentService.getDeliveryInfo();
    } catch (error) {
      console.error('Error fetching delivery info:', error);
      return null;
    }
  }, [dynamicContentService]);

  // ✅ CORRECTION: Gestion des messages standards avec données dynamiques
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

    // ✅ CORRECTION MOBILE: Gestion "Comment y jouer ?" avec vraies données DB
    if (content.includes('Comment y jouer') || content.includes('Comment ça fonctionne')) {
      console.log('🎮 Mobile: Récupération des règles du jeu depuis la base de données');
      
      let gameRules = '';
      
      try {
        // ✅ CORRECTION: Récupération sécurisée depuis la table products
        const { data: productData, error }: { data: any, error: any } = await supabase
          .from('products')
          .select('game_rules, name')
          .eq('id', product.id)  // ✅ product vient des props
          .single();

        if (error || !productData) {
          console.error('❌ Mobile - Erreur récupération produit:', error);
          gameRules = `❓ **Comment jouer au jeu ${product.name} :**

    Une erreur est survenue lors du chargement des règles. 

    📞 **Contactez-nous pour plus d'informations :**
    • WhatsApp : +221 78 136 27 28
    • Email : contact@viensonseconnait.com

    Nous vous enverrons les règles détaillées !`;
        } else if (productData.game_rules && productData.game_rules.trim()) {
          console.log('✅ Mobile - Règles du jeu trouvées:', productData.game_rules.substring(0, 100) + '...');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

    ${productData.game_rules}

    🎯 **Prêt(e) à vivre cette expérience ?**`;
        } else {
          console.log('⚠️ Mobile - Pas de règles définies pour ce produit');
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
        console.error('❌ Mobile - Erreur base de données:', dbError);
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

    if (content.includes('C\'est pour qui') || content.includes('Pour qui')) {
      const targetInfo = await getProductInfoFromDatabase('target');
      return {
        type: 'assistant',
        content: targetInfo,
        choices: [
          '⚡ Commander maintenant',
          '⭐ Voir les témoignages',
          '💝 Quels bénéfices ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'target_audience' as ConversationStep
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

    if (content.includes('Infos livraison') || content.includes('📦')) {
      const deliveryInfo = await getDeliveryInfoFromDatabase();
      
      let deliveryContent = `🚚 **Informations de livraison**\n\n`;
      
      if (deliveryInfo) {
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

  // Fonction utilitaire: Créer un message d'erreur
    const createErrorResponse = (errorText: string): ChatMessageType => ({
    type: 'assistant',
    content: `😔 **${errorText}**

  Voulez-vous réessayer ou contacter notre support ?`,
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

  // Fonction d'envoi de message
  const handleMessageSend = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  };

  // ✅ CORRECTION: Fonction sendMessage avec gestion d'erreur améliorée
  const sendMessage = async (content: string) => {
  try {
    console.log('📱 Processing mobile message:', { 
      content: content.substring(0, 50), 
      sessionId, 
      productId: product.id 
    });
    
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

    let response: ChatMessageType;
    
    // ✅ UTILISER L'API AVEC GESTION D'ERREUR ROBUSTE
    console.log('🚀 Mobile: Sending to enhanced chat API...');
    
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
          sessionId: sessionId || `${product.id}_${Date.now()}`,
          storeId: storeId || 'default'
        }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Mobile API error ${apiResponse.status}: ${errorText}`);
      }

      const aiResponse = await apiResponse.json();
      console.log('✅ Mobile: Enhanced API response received');

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
      console.error('❌ Mobile: API call failed:', apiError);
      
      // ✅ FALLBACK: Si l'API échoue, traiter localement
      const isStandardButton = [
        'Poser une question', 'Comment y jouer', 'C\'est pour qui',
        'Quels bénéfices', 'Avis clients', 'Infos livraison', 'En savoir plus'
      ].some(btn => content.includes(btn));
      
      if (isStandardButton) {
        response = await handleStandardMessages(content);
      } else {
        response = createErrorResponse(`Problème de connexion: ${apiError instanceof Error ? apiError.message : 'Erreur inconnue'}`);
      }
    }
    
    // Délai d'attente pour l'animation
    setTimeout(() => {
      console.log('✅ Mobile: Response generated');
      addMessage(response);
      
      if (response.metadata?.orderData) {
        updateOrderData(response.metadata.orderData);
      }
    }, 800);

  } catch (err) {
    console.error('❌ Mobile: Error in sendMessage:', err);
    
    setTimeout(() => {
      const errorMessage = createErrorResponse(`Une erreur est survenue: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      addMessage(errorMessage);
    }, 500);
  }
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  };

  // ✅ CORRECTION MOBILE: handleChoiceSelect avec traitement spécial "Comment y jouer"
  const handleChoiceSelect = async (choice: string) => {
  if (isProcessing) {
    console.log('⏳ Processing in progress, ignoring choice');
    return;
  }

  console.log('🔘 Mobile choice selected:', choice);
  setIsProcessing(true);
  setShowTyping(true);
  
  try {
    // ✅ PRIORITÉ 1: Gestion des redirections WhatsApp
    if (choice.includes('Continuer sur WhatsApp') || 
        choice.includes('📞 Continuer sur WhatsApp') ||
        choice.includes('Parler à un conseiller') ||
        choice.includes('Contacter le support') ||
        choice.includes('📞 Contacter le support')) {
      
      console.log('📞 Mobile: Opening WhatsApp redirect');
      
      // Ajouter le message utilisateur
      const userMessage: ChatMessageType = {
        type: 'user',
        content: choice,
        timestamp: new Date().toISOString()
      };
      addMessage(userMessage);
      
      // Ouvrir WhatsApp avec gestion mobile améliorée
      const whatsappUrl = 'https://wa.me/221781362728';
      const whatsappText = encodeURIComponent(`Bonjour, je vous contacte depuis votre site pour le jeu ${product.name}`);
      const whatsappDeepLink = `whatsapp://send?phone=221781362728&text=${whatsappText}`;
      
      try {
        // Essayer d'abord le deep link WhatsApp
        window.location.href = whatsappDeepLink;
        
        // Fallback après 2 secondes si l'app ne s'ouvre pas
        setTimeout(() => {
          window.open(whatsappUrl, '_blank') || (window.location.href = whatsappUrl);
        }, 2000);
      } catch (error) {
        console.log('📞 Fallback to web WhatsApp');
        window.open(whatsappUrl, '_blank') || (window.location.href = whatsappUrl);
      }
      
      // Message de confirmation
      setTimeout(() => {
        const confirmMessage: ChatMessageType = {
          type: 'assistant',
          content: `✅ **Redirection vers WhatsApp**

Si WhatsApp ne s'est pas ouvert automatiquement, cliquez sur le lien :
👉 https://wa.me/221781362728

Notre équipe vous répondra rapidement !`,
          choices: [],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'whatsapp_opened' as ConversationStep,
            flags: { whatsappRedirect: true }
          },
          timestamp: new Date().toISOString()
        };
        addMessage(confirmMessage);
      }, 1000);
      
      return; // ✅ IMPORTANT: Sortir ici
    }

    // ✅ PRIORITÉ 2: Commander rapidement - CORRECTION MOBILE
    if (choice.includes('Commander rapidement') || choice.includes('⚡')) {
      console.log('⚡ Mobile: Processing express command');
      
      // Ajouter le message utilisateur
      const userMessage: ChatMessageType = {
        type: 'user',
        content: choice,
        timestamp: new Date().toISOString()
      };
      addMessage(userMessage);
      
      // Délai pour l'animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // ✅ CORRECTION: Appel direct à l'API avec gestion d'erreur
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: choice,
            productId: product.id,
            currentStep: currentStep || 'initial',
            orderData: orderData || {},
            sessionId: sessionId || `${product.id}_${Date.now()}`,
            storeId: storeId || 'default'
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`API error: ${apiResponse.status}`);
        }

        const aiResponse = await apiResponse.json();
        console.log('✅ Mobile express API response:', aiResponse);

        const response: ChatMessageType = {
          type: 'assistant',
          content: aiResponse.content || "Commande express en cours d'initialisation...",
          choices: aiResponse.choices || ['1 exemplaire', '2 exemplaires', '3 exemplaires'],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: aiResponse.nextStep || 'express_quantity',
            orderData: aiResponse.orderData,
            flags: aiResponse.flags || { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };

        addMessage(response);
        
        if (response.metadata?.orderData) {
          updateOrderData(response.metadata.orderData);
        }
        
        return; // ✅ IMPORTANT: Sortir ici
        
      } catch (expressError) {
        console.error('❌ Mobile express error:', expressError);
        
        // Message d'erreur spécifique pour la commande express
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Erreur lors du lancement de la commande express**

Une erreur technique est survenue. Voulez-vous réessayer ?

**Détails de l'erreur :** ${expressError instanceof Error ? expressError.message : 'Erreur inconnue'}`,
          choices: ['🔄 Réessayer', '📞 Contacter le support'],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'express_error' as ConversationStep,
            flags: { hasError: true }
          },
          timestamp: new Date().toISOString()
        };
        
        addMessage(errorMessage);
        return; // ✅ IMPORTANT: Sortir ici
      }
    }
    
    // ✅ PRIORITÉ 3: Traitement spécial "Comment y jouer"
    if (choice.includes('Comment y jouer') || choice === '❓ Comment y jouer ?') {
      console.log('🎮 Mobile: Traitement spécial "Comment y jouer"');
      
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
        // ✅ RÉCUPÉRATION DIRECTE DEPUIS SUPABASE avec gestion d'erreur
        const { data: productData, error } = await supabase
          .from('products')
          .select('game_rules, name')
          .eq('id', product.id)
          .single();

        if (error || !productData) {
          console.error('❌ Mobile - Erreur récupération produit:', error);
          gameRules = `❓ **Comment jouer au jeu ${product.name} :**

Une erreur est survenue lors du chargement des règles. 

📞 **Contactez-nous pour plus d'informations :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

Nous vous enverrons les règles détaillées !`;
        } else if (productData.game_rules && productData.game_rules.trim()) {
          console.log('✅ Mobile - Règles du jeu trouvées');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

${productData.game_rules}

🎯 **Prêt(e) à vivre cette expérience ?**`;
        } else {
          console.log('⚠️ Mobile - Pas de règles définies pour ce produit');
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
        console.error('❌ Mobile - Erreur base de données:', dbError);
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
    
    // ✅ POUR TOUS LES AUTRES CHOIX: Traitement normal via sendMessage
    await sendMessage(choice);
    
  } catch (error) {
    console.error('❌ Mobile: Error sending choice:', error);
    
    // Message d'erreur général en cas de problème
    const errorMessage: ChatMessageType = {
      type: 'assistant',
      content: `😔 **Erreur temporaire**

Un problème est survenu lors du traitement de votre choix.

**Erreur :** ${error instanceof Error ? error.message : 'Erreur inconnue'}

Voulez-vous réessayer ?`,
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
    setShowTyping(false);
    setIsProcessing(false);
  }
};

  const handleClosePaymentModal = () => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  };

  // Rendu conditionnel
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
          <p className="text-gray-600">Initialisation du chat...</p>
        </div>
      </div>
    );
  }

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
      <div className="fixed inset-0 bg-white z-50 flex flex-col touch-manipulation">
        {/* Header mobile avec stats */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          {/* En-tête principal */}
          <div className="py-3 px-4 flex items-center gap-4">
            <button
              type="button"
              onClick={onBackClick}
              className="text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            {/* Image du produit */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gray-100">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="font-semibold text-[#132D5D] text-sm">Le Jeu {product.name}</h2>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < rating
                          ? 'fill-[#FF7E93] text-[#FF7E93]'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  ({stats.reviewsCount} avis)
                </span>
              </div>
            </div>
          </div>

          {/* Barre de commande mobile intégrée */}
         {orderData?.items && orderData.items.length > 0 && (
           <div className="bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border-t border-[#FF7E93]/20 px-4 py-3">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center w-6 h-6 bg-[#FF7E93] rounded-full">
                   <ShoppingBag className="w-3 h-3 text-white" />
                 </div>
                 <div>
                   <p className="text-xs font-medium text-[#132D5D]">
                     Ma commande ({(orderData.items || []).reduce((sum, item) => sum + item.quantity, 0)} article{((orderData.items || []).reduce((sum, item) => sum + item.quantity, 0)) > 1 ? 's' : ''})
                   </p>
                   <p className="text-xs text-gray-600 truncate max-w-[200px]">
                     {(orderData.items || []).map(item => `${item.name} x${item.quantity}`).join(', ')}
                   </p>
                 </div>
               </div>
               
               <div className="text-right">
                 <p className="text-sm font-bold text-[#FF7E93]">
                   {(orderData.total_amount || 0).toLocaleString()} FCFA
                 </p>
                 <p className="text-xs text-gray-500">Total</p>
               </div>
             </div>
           </div>
         )}
       </div>

       {/* Zone des messages optimisée pour mobile */}
       <div
         ref={chatRef}
         className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4 overscroll-y-contain"
         style={{ WebkitOverflowScrolling: 'touch' }}
       >
         {messages && messages.length > 0 ? (
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
                         handleChoiceSelect(qty.toString());
                       }}
                       maxQuantity={message.metadata?.maxQuantity || 10}
                     />
                   </div>
                 )}
               </motion.div>
             ))}

             {/* Indicateur de frappe */}
             {showTyping && (
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
         ) : (
           <div className="flex items-center justify-center h-full">
             <div className="text-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E93] mx-auto mb-2" />
               <p className="text-gray-500 text-sm">Chargement du chat...</p>
             </div>
           </div>
         )}
       </div>

       {/* Zone de saisie mobile optimisée */}
       <div className="sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
         <div className="relative flex items-center">
           <input
             type="text"
             value={inputMessage}
             onChange={(e) => setInputMessage(e.target.value)}
             onKeyDown={handleKeyDown}
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
               onClick={handleMessageSend}
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

       {/* Modals de paiement pour mobile */}
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
   </ConversationProvider>
 );
};

export default MobileChatContainer;