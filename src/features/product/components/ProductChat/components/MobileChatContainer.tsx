// src/features/product/components/ProductChat/components/MobileChatContainer.tsx - VERSION COMPLÈTE MISE À JOUR

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Star, Mic, Send, ShoppingBag, Volume2, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutContext } from '@/core/context/LayoutContext';
import { useChatStore } from '@/stores/chatStore';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { WelcomeMessageService } from '@/lib/services/WelcomeMessageService';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { useSpeechRecognition } from '@/lib/services/SpeechRecognitionService';
import { usePersonalization } from '@/hooks/usePersonalization';
import TypingIndicator from './TypingIndicator';
import ChatMessage from './ChatMessage';
import ChatChoices from './ChatChoices';
import QuantitySelector from './QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { ProductData } from '@/types/chat';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import type { RealTimeStats } from '@/types/product';
import { supabase } from '@/lib/supabase';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';

interface MobileChatContainerProps {
  product: ProductData;
  storeId: string;
  onBackClick: () => void;
}

// 🎤 COMPOSANT INPUT VOCAL AMÉLIORÉ
const VoiceEnabledInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
}> = ({ value, onChange, onSend, disabled, placeholder }) => {
  const {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const [showVoiceMode, setShowVoiceMode] = useState(false);

  // Synchroniser le transcript avec l'input
  useEffect(() => {
    if (transcript && !isListening) {
      onChange(transcript);
      resetTranscript();
      setShowVoiceMode(false);
    }
  }, [transcript, isListening, onChange, resetTranscript]);

  const handleVoiceToggle = async () => {
    if (!isSupported) {
      alert('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    if (isListening) {
      stopListening();
      setShowVoiceMode(false);
    } else {
      try {
        setShowVoiceMode(true);
        await startListening({
          language: 'fr-FR',
          continuous: false,
          interimResults: true
        });
      } catch (err) {
        console.error('Erreur reconnaissance vocale:', err);
        setShowVoiceMode(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative">
      {/* Mode vocal actif */}
      {showVoiceMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-[#FF7E93] rounded-xl text-white text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">
              {isListening ? 'Je vous écoute...' : 'Activez votre micro'}
            </span>
          </div>
          {transcript && (
            <div className="text-xs opacity-90">"{transcript}"</div>
          )}
          {error && (
            <div className="text-xs text-red-200 mt-1">{error}</div>
          )}
        </motion.div>
      )}

      {/* Champ de saisie */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
          maxLength={500}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Bouton micro */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={disabled || !isSupported}
            className={`p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : isSupported && !disabled
                  ? 'text-gray-500 hover:text-[#FF7E93] hover:bg-gray-50'
                  : 'text-gray-400 cursor-not-allowed'
            }`}
            title={
              !isSupported 
                ? 'Reconnaissance vocale non supportée' 
                : isListening 
                  ? 'Arrêter l\'écoute'
                  : 'Reconnaissance vocale'
            }
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Bouton envoi */}
          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className={`p-2 transition-colors ${
              value.trim() && !disabled
                ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title={disabled ? 'Traitement en cours...' : 'Envoyer le message'}
          >
            {disabled ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF7E93] rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const MobileChatContainer: React.FC<MobileChatContainerProps> = ({
  product,
  storeId,
  onBackClick
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const { setHideHeaderGroup } = useLayoutContext();
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeModalData, setStripeModalData] = useState<{
    amount: number;
    orderId: string;
  } | null>(null);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ États locaux simplifiés pour éviter les boucles
  const [initializationStarted, setInitializationStarted] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(product.stats?.satisfaction || 5);

  // ✅ Service optimisé et d'accueil HARMONISÉS
  const optimizedService = OptimizedChatService.getInstance();
  const welcomeService = WelcomeMessageService.getInstance();

  // Utilisation sélective du store pour éviter les re-renders
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
    updateOrderData,
    currentStep = null,
    flags = {
      hasError: false,
      stockReserved: false,
      orderCompleted: false,
      paymentInitiated: false,
      isInitialized: false
    }
  } = store;

  // ✅ HOOK DE PERSONNALISATION MOBILE
  const {
    analyzeMessage,
    getPersonalizedRecommendations,
    personalizeMessage,
    getUserProfile,
    isProfileReady
  } = usePersonalization({
    sessionId,
    productId: product.id,
    productName: product.name,
    messages,
    onProfileUpdate: (profile) => {
      console.log('🎯 [MOBILE] Profile updated:', profile.relationshipStatus, profile.interests);
    }
  });

  // État du panier dérivé des messages et orderData
  const [cartInfo, setCartInfo] = useState({
    hasItems: false,
    itemsCount: 0,
    totalAmount: 0,
    productName: `le jeu ${product.name}`
  });

  // ✅ CORRECTION MAJEURE: Fonction de détection du panier pour mobile HARMONISÉE
  const detectCartFromMessages = useCallback(() => {
    console.log('🛒 [MOBILE] DÉTECTION PANIER HARMONISÉE:', { 
      orderData, 
      messagesLength: messages?.length,
      currentStep,
      flags
    });

    let newCartInfo = {
      hasItems: false,
      itemsCount: 0,
      totalAmount: 0,
      productName: `le jeu ${product.name}`
    };

    // PRIORITÉ 1: orderData direct (plus fiable)
    if (orderData.quantity && orderData.quantity > 0) {
      const totalAmount = (orderData.quantity || 1) * product.price;
      
      newCartInfo = {
        hasItems: true,
        itemsCount: orderData.quantity,
        totalAmount: totalAmount,
        productName: `le jeu ${product.name}`
      };
      
      console.log('✅ [MOBILE] Cart found in orderData:', newCartInfo);
      return newCartInfo;
    }

    // PRIORITÉ 2: Analyser les messages pour détecter une commande
    if (messages && messages.length > 0) {
      const hasCommanderMessages = messages.some(msg => {
        const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
        return content.includes('C\'est noté ! Vous commandez') ||
               content.includes('exemplaire') ||
               content.includes('Prix total') ||
               content.includes('ÉTAPE') ||
               (msg.metadata?.flags?.expressMode && msg.metadata?.flags?.quantitySelection);
      });

      if (hasCommanderMessages) {
        let quantity = 1;
        
        // Analyser les messages de la fin vers le début pour trouver la quantité
        for (const msg of [...messages].reverse()) {
          const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
          
          if (content.includes('exemplaire') || content.includes('ÉTAPE')) {
            const qtyMatch = content.match(/(\d+)\s*exemplaire/);
            if (qtyMatch) quantity = parseInt(qtyMatch[1]);
            
            // Essayer d'extraire le prix total du message
            const priceMatch = content.match(/(\d+(?:[\s,]\d{3})*)\s*FCFA/);
            if (priceMatch) {
              const totalAmount = parseInt(priceMatch[1].replace(/[\s,]/g, ''));
              
              newCartInfo = {
                hasItems: true,
                itemsCount: quantity,
                totalAmount: totalAmount,
                productName: `le jeu ${product.name}`
              };
              
              console.log('✅ [MOBILE] Cart found in messages:', newCartInfo);
              break;
            } else {
              // Calculer le total basé sur le prix du produit et la quantité
              newCartInfo = {
                hasItems: true,
                itemsCount: quantity,
                totalAmount: quantity * product.price,
                productName: `le jeu ${product.name}`
              };
              
              console.log('✅ [MOBILE] Cart calculated from quantity:', newCartInfo);
              break;
            }
          }
        }
      }
    }

    console.log('📊 [MOBILE] Final cart info:', newCartInfo);
    return newCartInfo;
  }, [orderData, messages, currentStep, flags, product.name, product.price]);

  // ✅ EFFET pour mettre à jour le panier quand les messages ou orderData changent
  useEffect(() => {
    const newCartInfo = detectCartFromMessages();
    
    // Seulement mettre à jour si quelque chose a changé
    if (JSON.stringify(newCartInfo) !== JSON.stringify(cartInfo)) {
      console.log('🔄 [MOBILE] Updating cart info:', newCartInfo);
      setCartInfo(newCartInfo);
    }
  }, [detectCartFromMessages, cartInfo]);

  // ✅ INITIALISATION CORRIGÉE - HARMONISÉE AVEC DESKTOP
  useEffect(() => {
    if (!product?.id || initializationStarted || welcomeMessageSent) {
      return;
    }

    const initializeChat = async () => {
      try {
        console.log('📱 Initializing mobile chat session HARMONIZED:', { 
          productId: product.id, 
          storeId,
          initializationStarted,
          welcomeMessageSent,
          existingMessages: messages.length
        });
        
        setInitializationStarted(true);

        // Vérifier si des messages existent déjà
        if (messages.length > 0) {
          console.log('📝 Mobile chat already has messages, skipping initialization');
          setWelcomeMessageSent(true);
          return;
        }

        // Initialiser la session
        if (initializeSession) {
          const newSessionId = sessionId || `mobile_${product.id}_${Date.now()}`;
          initializeSession(product.id, storeId, newSessionId);
        }
        
        // ✅ NOUVEAU: Séquence réaliste avec typing indicator et message HARMONISÉ
        setTimeout(() => {
          // Vérifier encore une fois qu'aucun message n'a été ajouté
          const currentState = useChatStore.getState();
          
          if (currentState.messages.length === 0 && !welcomeMessageSent) {
            // ✅ ÉTAPE 1: Afficher "Rose écrit..." pendant 2.5 secondes
            console.log('📝 [MOBILE] Showing typing indicator...');
            setShowTyping(true);
            updateTypingStatus(true);
            
            // ✅ ÉTAPE 2: Après 2.5 secondes, afficher le MESSAGE HARMONISÉ
            setTimeout(() => {
              setShowTyping(false);
              updateTypingStatus(false);
              
              // ✅ UTILISER LE SERVICE HARMONISÉ POUR MOBILE avec "le jeu"
              const welcomeMessage = welcomeService.generateMobileWelcomeMessage(
                product.name,
                sessionId,
                product.id,
                product.price
              );
              
              console.log('📝 [MOBILE] Adding HARMONIZED welcome message');
              addMessage(welcomeMessage);
              setWelcomeMessageSent(true);
            }, 2500); // ✅ 2.5 secondes de typing indicator (comme desktop)
          } else {
            console.log('⚠️ Mobile: Welcome message skipped - messages exist or already sent');
            setWelcomeMessageSent(true);
          }
        }, 800); // ✅ Délai initial avant typing
        
      } catch (error) {
        console.error('❌ Error initializing mobile chat:', error);
        setInitializationStarted(true);
        setWelcomeMessageSent(true);
      }
    };

    initializeChat();
  }, [product.id, storeId, initializationStarted, welcomeMessageSent, updateTypingStatus, addMessage, welcomeService, sessionId]);

  // ✅ Header management
  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, []);

  // ✅ STATS LOADING AVEC TESTIMONIALS RÉELS HARMONISÉ
  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      try {
        // ✅ CHARGER LES VRAIES DONNÉES depuis testimonials
        const [productStats, testimonialsCount, averageRating] = await Promise.all([
          productStatsService.getProductStats(product.id),
          testimonialsService.getTestimonialsCountByProduct(product.id),
          testimonialsService.getAverageRating(product.id)
        ]);
        
        if (!isSubscribed) return;

        // ✅ UTILISER LES VRAIES DONNÉES D'AVIS
        setStats({
          viewsCount: productStats.currentViewers || 1,
          salesCount: productStats.sold || 0,
          reviewsCount: testimonialsCount || 0
        });

        // ✅ UTILISER LA VRAIE NOTE MOYENNE
        if (averageRating > 0) {
          setRating(averageRating);
        }

        console.log('📊 [MOBILE] Real stats loaded:', {
          viewsCount: productStats.currentViewers || 1,
          salesCount: productStats.sold || 0,
          reviewsCount: testimonialsCount || 0,
          rating: averageRating || rating
        });

      } catch (error) {
        console.error('Error loading stats:', error);
        // ✅ FALLBACK : Essayer de charger depuis la base directement
        try {
          const { data: testimonials } = await supabase
            .from('testimonials')
            .select('rating')
            .eq('product_id', product.id);

          if (isSubscribed && testimonials) {
            const count = testimonials.length;
            const avgRating = testimonials.length > 0 
              ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
              : (product.rating || 5);

            setStats(prev => ({
              ...prev,
              reviewsCount: count
            }));
            
            if (avgRating > 0) {
              setRating(avgRating);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback stats loading failed:', fallbackError);
          // Utiliser stats par défaut réalistes
          if (isSubscribed) {
            setStats({
              viewsCount: Math.floor(Math.random() * 8) + 2,
              salesCount: Math.floor(Math.random() * 25) + 10,
              reviewsCount: Math.floor(Math.random() * 12) + 5
            });
          }
        }
      }
    };

    if (product.id) {
      initializeStats();
      // Incrémenter les vues
      productStatsService.incrementViewCount(product.id);
    }

    return () => {
      isSubscribed = false;
    };
  }, [product.id]);

  // ✅ Auto-scroll optimisé
  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, showTyping]);

  // ✅ CORRECTION MAJEURE: Envoi de message HARMONISÉ AVEC DESKTOP + PERSONNALISATION
  const sendMessage = useCallback(async (content: string) => {
    if (isProcessing) {
      console.log('⏳ Already processing a message, ignoring');
      return;
    }

    try {
      console.log('📱 Processing mobile message HARMONIZED with PERSONALIZATION:', { content: content.substring(0, 50) });
      
      // ✅ ANALYSER LE MESSAGE POUR LA PERSONNALISATION
      analyzeMessage(content);
      
      // ✅ GESTION: Ouverture du modal Stripe
      if (content.startsWith('STRIPE_MODAL_OPEN:')) {
        const amount = parseInt(content.split(':')[1]);
        const orderId = `STRIPE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        setStripeModalData({ amount, orderId });
        setStripeModalOpen(true);
        return;
      }
      
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

      // ✅ AFFICHER LE TYPING INDICATOR
      setShowTyping(true);
      updateTypingStatus(true);

      let response: ChatMessageType;
      
      // ✅ CORRECTION MAJEURE: Utiliser le service HARMONISÉ avec Desktop
      try {
        console.log('🤖 [MOBILE] Using HARMONIZED OptimizedChatService...');
        
        response = await optimizedService.processMessage(
          sessionId || `${product.id}_${Date.now()}`,
          content,
          currentStep || 'initial',
          product.id,
          product.name
        );
        
        console.log('✅ Mobile: Harmonized service response received:', {
          type: response.type,
          hasChoices: !!(response.choices && response.choices.length > 0),
          nextStep: response.metadata?.nextStep,
          flags: response.metadata?.flags
        });

      } catch (serviceError) {
        console.error('❌ Mobile: Harmonized service failed, using API fallback:', serviceError);
        
        // ✅ FALLBACK: Utiliser API chat pour mobile
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            productId: product.id,
            productName: product.name,
            currentStep: currentStep || 'initial',
            orderData: orderData || {},
            sessionId: sessionId || `${product.id}_${Date.now()}`,
            storeId: storeId || 'default',
            forceAI: true // ✅ HARMONISATION: Forcer l'IA comme sur desktop
          }),
        });

        if (apiResponse.ok) {
          const aiResponse = await apiResponse.json();
          console.log('✅ Mobile: API fallback response received');

          response = {
            type: 'assistant',
            content: aiResponse.message || "Je suis là pour vous aider !",
            choices: aiResponse.choices || ["Je veux l'acheter maintenant", "J'ai des questions à poser"],
            assistant: {
              name: 'Rose',
              title: 'Agent IA VIENS ON S\'CONNAÎT'
            },
            metadata: {
              nextStep: aiResponse.nextStep || currentStep,
              orderData: aiResponse.orderData,
              flags: aiResponse.flags || {}
            },
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('API fallback failed');
        }
      }

      // ✅ PERSONNALISER LA RÉPONSE SI POSSIBLE
      let finalResponse = response;
      if (isProfileReady && typeof response.content === 'string') {
        const personalizedContent = personalizeMessage(
          response.content,
          response.metadata?.nextStep || currentStep
        );
        
        if (personalizedContent !== response.content) {
          finalResponse = {
            ...response,
            content: personalizedContent,
            metadata: {
              ...response.metadata,
              flags: {
                ...response.metadata?.flags,
                personalized: true
              }
            }
          };
          console.log('🎯 [MOBILE] Message personalized based on user profile');
        }
      }

      // ✅ DÉLAI RÉALISTE BASÉ SUR LA LONGUEUR DE LA RÉPONSE (comme desktop)
      const responseLength = typeof finalResponse.content === 'string' ? finalResponse.content.length : 100;
      const realisticDelay = Math.min(Math.max(responseLength * 30, 1200), 3500); // Entre 1.2s et 3.5s

      console.log(`⏱️ [MOBILE] Response delay calculated: ${realisticDelay}ms for ${responseLength} characters`);
      
      // Délai pour l'animation
      setTimeout(() => {
        // Cacher le typing indicator
        setShowTyping(false);
        updateTypingStatus(false);
        
        console.log('✅ Mobile: Response generated and added');
        addMessage(finalResponse);
        
        if (finalResponse.metadata?.orderData) {
          updateOrderData(finalResponse.metadata.orderData);
        }
        
        // Mettre à jour le step si nécessaire
        if (finalResponse.metadata?.nextStep && store.setCurrentStep) {
          store.setCurrentStep(finalResponse.metadata.nextStep);
        }
      }, realisticDelay);

    } catch (err) {
      console.error('❌ Mobile: Error in sendMessage:', err);
      
      // Cacher le typing indicator en cas d'erreur
      setShowTyping(false);
      updateTypingStatus(false);
      
      setTimeout(() => {
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Une erreur s'est produite**

${err instanceof Error ? err.message : 'Erreur inconnue'}

Voulez-vous réessayer ?`,
          choices: ['🔄 Réessayer', '💬 Poser une question', '🏠 Retour accueil'],
          assistant: { name: 'Rose', title: 'Agent IA VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'error_recovery' as ConversationStep,
            flags: { hasError: true }
          },
          timestamp: new Date().toISOString()
        };
        addMessage(errorMessage);
      }, 500);
    }
  }, [isProcessing, product.id, product.name, currentStep, orderData, sessionId, storeId, addMessage, updateOrderData, optimizedService, store, analyzeMessage, isProfileReady, personalizeMessage, updateTypingStatus]);

  // ✅ Gestion des choix avec protection
  const handleChoiceSelect = useCallback(async (choice: string) => {
    if (isProcessing) {
      console.log('⏳ Processing in progress, ignoring choice');
      return;
    }

    console.log('🔘 Mobile choice selected:', choice);
    setIsProcessing(true);
    
    try {
      await sendMessage(choice);
    } catch (error) {
      console.error('❌ Error sending choice:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sendMessage]);

  // ✅ Envoi de message depuis input
  const handleMessageSend = useCallback(async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [inputMessage, isProcessing, sendMessage]);

  const handleClosePaymentModal = useCallback(() => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  }, [setPaymentModal]);

  // ✅ RENDU CONDITIONNEL
  if (!initializationStarted) {
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
        {/* ✅ HEADER STYLE ÉPURÉ AVEC "LE JEU" */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="py-3 px-4 flex items-center gap-4">
            <button
              type="button"
              onClick={onBackClick}
              className="text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gray-100">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={`le jeu ${product.name}`}
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

            {/* ✅ PROFIL UTILISATEUR DEBUG MOBILE (à enlever en production) */}
            {process.env.NODE_ENV === 'development' && isProfileReady && (
              <div className="text-xs text-gray-400 bg-gray-100 p-1 rounded">
                🎯 {getUserProfile()?.relationshipStatus}
              </div>
            )}
          </div>

          {/* ✅ BARRE PANIER MOBILE SIMPLIFIÉE - AFFICHAGE UNIQUEMENT */}
          {cartInfo.hasItems && cartInfo.itemsCount > 0 && cartInfo.totalAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border-t border-[#FF7E93]/20 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-6 h-6 bg-[#FF7E93] rounded-full">
                    <ShoppingBag className="w-3 h-3 text-white" />
                    {cartInfo.itemsCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {cartInfo.itemsCount}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#132D5D]">
                      Ma commande ({cartInfo.itemsCount} article{cartInfo.itemsCount > 1 ? 's' : ''})
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]">
                      {cartInfo.productName} x{cartInfo.itemsCount}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-bold text-[#FF7E93]">
                    {cartInfo.totalAmount.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ✅ ZONE DES MESSAGES */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4 overscroll-y-contain relative"
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

              {(showTyping || isTyping) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key="typing-indicator"
                >
                  <TypingIndicator assistantName="Rose" />
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

        {/* ✅ ZONE DE SAISIE AVEC VOCAL HARMONISÉE */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <VoiceEnabledInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={handleMessageSend}
            disabled={isProcessing}
            placeholder="Tapez votre message..."
          />
        </div>

        {/* ✅ MODALS DE PAIEMENT CORRIGÉS */}
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

        {/* ✅ CORRECTION MAJEURE: Modal Stripe corrigé pour mobile */}
        <StripePaymentModal
          isOpen={stripeModalOpen}
          onClose={() => {
            setStripeModalOpen(false);
            setStripeModalData(null);
          }}
          amount={stripeModalData?.amount}
          orderId={stripeModalData?.orderId}
          currency="fcfa"
          onSuccess={(paymentIntentId) => {
            console.log('✅ Mobile Stripe payment successful:', paymentIntentId);
            setStripeModalOpen(false);
            setStripeModalData(null);
            
            // ✅ NOUVEAU: Envoyer message de confirmation SEULEMENT après succès
            const confirmationMessage: ChatMessageType = {
              type: 'assistant',
              content: `🎉 **Paiement Stripe confirmé !**

✅ **Transaction réussie :** ${paymentIntentId}
✅ **Votre commande est maintenant confirmée**

**Détails de livraison :**

📍 ${orderData?.address || 'Adresse confirmée'}, ${orderData?.city || 'Ville confirmée'}
⏰ Livraison sous 24-48h ouvrables
📞 Nous vous tiendrons informé(e) via WhatsApp

🙏 Merci pour votre confiance !`,
              choices: [
                '⭐ Parfait, merci !',
                '🛍️ Commander un autre jeu',
                '📱 Télécharger l\'app mobile'
              ],
              assistant: { name: 'Rose', title: 'Agent IA VIENS ON S\'CONNAÎT' },
              metadata: {
                nextStep: 'express_completed' as ConversationStep,
                orderData: {
                  paymentMethod: 'card',
                  transactionId: paymentIntentId,
                  status: 'confirmed'
                },
                flags: { 
                  orderCompleted: true,
                  paymentConfirmed: true,
                  stripeVerified: true
                }
              },
              timestamp: new Date().toISOString()
            };
            
            addMessage(confirmationMessage);
          }}
          onError={(error) => {
            console.error('❌ Mobile Stripe payment error:', error);
          }}
        />

        {/* Legacy Stripe modal pour compatibilité */}
        {payment?.status === 'processing' && payment?.clientSecret && (
          <StripePaymentModal
            isOpen={true}
            onClose={() => setStripeModalOpen(false)}
            clientSecret={payment.clientSecret}
          />
        )}
      </div>
    </ConversationProvider>
  );
};

export default MobileChatContainer;