// src/app/(public)/payment/[status]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';

export default function PaymentStatusPage({ params }: { params: { status: string } }) {
  const searchParams = useSearchParams();
  const reference = searchParams.get('ref');
  const isSuccess = params.status === 'success';

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.assign('/'); 
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {isSuccess ? (
          <div className="bg-green-100 p-6 rounded-full mb-4">
            <Check className="w-12 h-12 text-green-500" />
          </div>
        ) : (
          <div className="bg-red-100 p-6 rounded-full mb-4">
            <X className="w-12 h-12 text-red-500" />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-2">
          {isSuccess ? 'Paiement réussi' : 'Paiement échoué'}
        </h1>
        <p className="text-gray-600 mb-4">
          {isSuccess 
            ? 'Votre commande a été confirmée. Vous recevrez bientôt un email de confirmation.'
            : 'Une erreur est survenue lors du paiement. Veuillez réessayer.'}
        </p>
        <p className="text-sm text-gray-500">
          Référence: {reference}
        </p>
      </div>
    </div>
  );
}