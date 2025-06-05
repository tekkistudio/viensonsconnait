// src/app/(public)/payment/success/page.tsx - VERSION CORRIGÉE
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Composant qui utilise useSearchParams (doit être dans Suspense)
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  // ✅ Gestion sécurisée des paramètres
  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || 'N/A';
  const status = searchParams.get('status') || 'success';

  useEffect(() => {
    // Redirection automatique après 3 secondes
    const timer = setTimeout(() => {
      setIsRedirecting(false);
      // Rediriger vers la page d'accueil ou chat
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            {status === 'success' ? 'Paiement réussi !' : 'Commande confirmée !'}
          </h1>
          <p className="text-gray-600">
            Votre commande #{orderId} a été confirmée avec succès.
          </p>
        </div>

        {isRedirecting ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E93] mx-auto"></div>
            <p className="text-gray-500">Redirection automatique...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500">Merci pour votre confiance !</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#FF7E93] text-white px-6 py-2 rounded-lg hover:bg-[#FF7E93]/90 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant de chargement
function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
        <p className="text-gray-600">Vérification du paiement...</p>
      </div>
    </div>
  );
}

// Composant principal avec Suspense boundary
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}