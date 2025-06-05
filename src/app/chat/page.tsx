// src/app/chat/page.tsx - VERSION CORRIGÉE AVEC SUSPENSE
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, ConversationStep } from '@/types/chat';

// Composant interne qui utilise useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatStore = useChatStore();
  
  // ✅ CORRECTION: Gestion sécurisée de orderId
  const orderId = searchParams.get('order_id') || undefined;

  // Votre logique existante ici...
  // (garde le reste du code tel quel)

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Paiement réussi !</h1>
          <p className="text-gray-600">
            Votre commande #{orderId || 'N/A'} a été confirmée avec succès.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant de chargement
function ChatPageLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}