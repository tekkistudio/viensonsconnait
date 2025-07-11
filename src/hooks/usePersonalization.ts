// src/hooks/usePersonalization.ts - HOOK DE PERSONNALISATION

import { useEffect, useCallback, useRef } from 'react';
import { PersonalizationService } from '@/lib/services/PersonalizationService';
import type { ChatMessage } from '@/types/chat';

interface UsePersonalizationProps {
  sessionId: string;
  productId: string;
  productName: string;
  messages: ChatMessage[];
  onProfileUpdate?: (profile: any) => void;
}

interface UsePersonalizationReturn {
  analyzeMessage: (message: string) => void;
  getPersonalizedRecommendations: () => Promise<any[]>;
  personalizeMessage: (message: string, step: any) => string;
  getUserProfile: () => any;
  isProfileReady: boolean;
}

export const usePersonalization = ({
  sessionId,
  productId,
  productName,
  messages,
  onProfileUpdate
}: UsePersonalizationProps): UsePersonalizationReturn => {
  const personalizationService = useRef(PersonalizationService.getInstance());
  const isInitialized = useRef(false);

  // ✅ INITIALISATION DU PROFIL
  useEffect(() => {
    if (!isInitialized.current && sessionId) {
      console.log('🎯 Initializing personalization for session:', sessionId.substring(0, 8));
      
      // Analyser l'historique des messages existants
      messages.forEach(message => {
        if (message.type === 'user' && typeof message.content === 'string') {
          personalizationService.current.analyzeUserMessage(
            sessionId,
            message.content,
            messages
          );
        }
      });
      
      isInitialized.current = true;
    }
  }, [sessionId, messages]);

  // ✅ ANALYSER UN NOUVEAU MESSAGE
  const analyzeMessage = useCallback((message: string) => {
    if (!sessionId) return;
    
    console.log('🎯 Analyzing message for personalization:', message.substring(0, 50));
    
    const profile = personalizationService.current.analyzeUserMessage(
      sessionId,
      message,
      messages
    );
    
    // Notifier le parent si callback fourni
    if (onProfileUpdate) {
      onProfileUpdate(profile);
    }
    
    return profile;
  }, [sessionId, messages, onProfileUpdate]);

  // ✅ OBTENIR DES RECOMMANDATIONS PERSONNALISÉES
  const getPersonalizedRecommendations = useCallback(async () => {
    if (!sessionId) return [];
    
    const profile = personalizationService.current.getProfile(sessionId);
    if (!profile) return [];
    
    console.log('🎯 Generating personalized recommendations for profile:', profile.relationshipStatus);
    
    const recommendations = await personalizationService.current.generatePersonalizedRecommendations({
      sessionId,
      productId,
      productName,
      conversationHistory: messages,
      currentProfile: profile
    });
    
    return recommendations;
  }, [sessionId, productId, productName, messages]);

  // ✅ PERSONNALISER UN MESSAGE
  const personalizeMessage = useCallback((message: string, step: any) => {
    if (!sessionId) return message;
    
    const profile = personalizationService.current.getProfile(sessionId);
    if (!profile) return message;
    
    return personalizationService.current.personalizeMessage(
      message,
      profile,
      { productName, step }
    );
  }, [sessionId, productName]);

  // ✅ OBTENIR LE PROFIL UTILISATEUR
  const getUserProfile = useCallback(() => {
    if (!sessionId) return null;
    return personalizationService.current.getProfile(sessionId);
  }, [sessionId]);

  // ✅ VÉRIFIER SI LE PROFIL EST PRÊT
  const isProfileReady = Boolean(sessionId && personalizationService.current.getProfile(sessionId));

  return {
    analyzeMessage,
    getPersonalizedRecommendations,
    personalizeMessage,
    getUserProfile,
    isProfileReady
  };
};