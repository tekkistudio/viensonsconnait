// src/hooks/useMessageRedirect.ts
import { useEffect } from 'react';
import type { ChatMessage } from '@/types/chat';

export const useMessageRedirect = (messages: ChatMessage[]) => {
  useEffect(() => {
    const handleRedirect = (message: ChatMessage) => {
      if (message.metadata?.action === 'redirect') {
        if (message.metadata.externalUrl) {
          const { url, type } = message.metadata.externalUrl;
          // Pour les liens externes, utiliser window.open pour une meilleure UX
          if (type === 'whatsapp' || type === 'email') {
            window.open(url, '_blank');
          } else {
            window.location.href = url;
          }
        }
      }
    };

    // Ne regarder que le dernier message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      handleRedirect(lastMessage);
    }
  }, [messages]);
};