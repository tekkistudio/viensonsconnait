// src/app/(public)/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const ref = searchParams.get('ref');
      
      if (!sessionId && !ref) {
        router.replace('/');
        return;
      }

      try {
        const response = await fetch(`/api/payments/status?${
          sessionId ? `sessionId=${sessionId}` : `transactionId=${ref}`
        }`);
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setOrderDetails(data.data);
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-[#FF7E93] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Vérification du paiement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Merci pour votre commande !
          </h1>
          
          {orderDetails && (
            <div className="mt-6 w-full">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Commande #{orderDetails.orderId}
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {orderDetails.amount.toLocaleString()} {orderDetails.currency}
                </p>
              </div>
            </div>
          )}

          <p className="mt-4 text-gray-600 text-center">
            Vous recevrez un email de confirmation avec les détails de votre commande.
          </p>

          <div className="mt-8 space-y-3 w-full">
            <Button
              onClick={() => router.push('/account/orders')}
              variant="default"
              className="w-full"
            >
              Voir ma commande
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}