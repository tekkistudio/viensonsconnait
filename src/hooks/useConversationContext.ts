// src/hooks/useConversationContext.ts
import React from 'react';
import type { ReactNode } from 'react';

interface ConversationContextType {
  productId: string;
  sessionId: string;
  storeId: string;
  customerInfo?: {
    firstName?: string;
    lastName?: string;
    city?: string;
    email?: string;
  };
}

type ConversationProviderProps = {
  children: ReactNode;
  value: ConversationContextType;
};

const ConversationContext = React.createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children, value }: ConversationProviderProps) {
  return React.createElement(
    ConversationContext.Provider,
    { value },
    children
  );
}

export function useConversationContext(): ConversationContextType {
  const context = React.useContext(ConversationContext);
  
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  
  return context;
}