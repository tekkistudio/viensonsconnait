// src/app/(public)/payment/error/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Un problème est survenu
          </h1>

          <p className="mt-4 text-gray-600 text-center">
            Le paiement n'a pas pu être complété. Aucun montant n'a été débité de votre compte.
          </p>

          <div className="mt-8 space-y-3 w-full">
            <Button
              onClick={() => router.back()}
              variant="default"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Réessayer le paiement
            </Button>

            <Button
              onClick={() => router.push('/contact')}
              variant="outline"
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contacter le support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}