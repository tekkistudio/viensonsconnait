// src/components/payment/UnifiedPaymentModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from 'next/image';
import { Loader2, CreditCard } from 'lucide-react';
import { PaymentGateway } from '@/lib/services/payment-gateway';
import { pusherClient } from '@/lib/pusher';
import type { PaymentProvider } from '@/types/payment';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city: string;
  };
  orderId: number;
  onPaymentComplete: (result: { success: boolean; transactionId?: string; error?: string }) => void;
}

interface PaymentOption {
  id: PaymentProvider;
  name: string;
  logo?: string;
  icon?: React.ReactNode;
  description: string;
  bgColor: string;
  textColor: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'WAVE',
    name: 'Wave',
    logo: '/images/payments/wave-logo.png',
    description: 'Payez facilement avec votre compte Wave',
    bgColor: 'bg-[#1BA7FF]/10',
    textColor: 'text-[#1BA7FF]'
  },
  {
    id: 'ORANGE_MONEY',
    name: 'Orange Money',
    logo: '/images/payments/om-logo.png',
    description: 'Payez avec votre compte Orange Money',
    bgColor: 'bg-[#FF7F27]/10',
    textColor: 'text-[#FF7F27]'
  },
  {
    id: 'STRIPE',
    name: 'Carte bancaire',
    icon: <CreditCard className="h-6 w-6" />,
    description: 'Payez avec Visa, Mastercard ou American Express',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600'
  }
];

export function UnifiedPaymentModal({
  isOpen,
  onClose,
  amount,
  currency,
  customerInfo,
  orderId,
  onPaymentComplete
}: UnifiedPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const paymentGateway = new PaymentGateway();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedMethod(null);
      setError(null);
      setQrCode(null);
      setTransactionId(null);
      setIframeUrl(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && transactionId) {
      // Subscribe to payment status updates
      const channel = pusherClient.subscribe(`payment_${transactionId}`);
      
      channel.bind('payment_status', (data: {
        status: 'COMPLETED' | 'FAILED' | 'PENDING';
        message?: string;
      }) => {
        if (data.status === 'COMPLETED') {
          onPaymentComplete({
            success: true,
            transactionId
          });
          onClose();
        } else if (data.status === 'FAILED') {
          setError(data.message || 'Le paiement a échoué');
          setIsLoading(false);
        }
      });

      return () => {
        pusherClient.unsubscribe(`payment_${transactionId}`);
      };
    }
  }, [isOpen, transactionId, onPaymentComplete, onClose]);

  const handlePaymentInitiation = async (method: PaymentProvider) => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedMethod(method);

      const response = await paymentGateway.initiatePayment({
        amount,
        currency,
        provider: method,
        customerInfo,
        orderId,
        metadata: {
          source: 'unified_payment_modal',
          initiatedAt: new Date().toISOString()
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Une erreur est survenue');
      }

      setTransactionId(response.transactionId!);
      
      if (response.qrCode) {
        setQrCode(response.qrCode);
      }
      
      if (response.checkoutUrl) {
        setIframeUrl(response.checkoutUrl);
      }
      
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      onPaymentComplete({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Une erreur est survenue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPaymentContent = () => {
    if (qrCode) {
      return (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Image
              src={`data:image/png;base64,${qrCode}`}
              alt="Code QR de paiement"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Scannez ce QR code avec votre application {selectedMethod === 'WAVE' ? 'Wave' : 'Orange Money'} pour finaliser le paiement
          </p>
        </div>
      );
    }

    if (iframeUrl) {
      return (
        <iframe
          src={iframeUrl}
          className="w-full h-[400px] border-0 rounded-lg"
          title="Paiement"
        />
      );
    }

    return (
      <div className="grid gap-3">
        {paymentOptions.map((option) => (
          <Button
            key={option.id}
            variant="outline"
            className={`h-auto p-4 flex items-center gap-4 ${
              selectedMethod === option.id 
                ? `${option.bgColor} border-2 border-current ${option.textColor}` 
                : ''
            }`}
            disabled={isLoading}
            onClick={() => handlePaymentInitiation(option.id)}
          >
            {option.logo ? (
              <div className="w-12 h-12 relative flex-shrink-0">
                <Image
                  src={option.logo}
                  alt={option.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : option.icon}
            <div className="flex-1 text-left">
              <div className="font-medium">{option.name}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>
            {isLoading && selectedMethod === option.id && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {qrCode || iframeUrl ? 'Finaliser le paiement' : 'Choisissez votre méthode de paiement'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderPaymentContent()}

          <div className="text-center text-sm text-muted-foreground">
            <p>Total à payer : {amount.toLocaleString()} {currency}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}