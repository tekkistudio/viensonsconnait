// src/features/product/components/ProductChat/components/PaymentButton.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import useCountryStore from '../../../../../core/hooks/useCountryStore';
import type { PaymentTotal } from '../../../types/chat';
import { PAYMENT_URLS } from '../../../../../config/payment';

interface PaymentModalProps {
  url: string;
  onClose: () => void;
}

const PaymentModal = ({ url, onClose }: PaymentModalProps) => {
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl h-[80vh] rounded-xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <iframe
          src={url}
          className="w-full h-full rounded-xl"
          title="Payment Page"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

interface PaymentButtonProps {
  type: 'wave-button' | 'om-button';
  total: PaymentTotal;
  paymentUrl?: string;
  isMobile?: boolean;
  orderId?: string; 
  onPaymentInitiated?: (transactionId: string) => void;  
}

const PaymentButton = ({ 
  type, 
  total, 
  paymentUrl,
  isMobile = false 
}: PaymentButtonProps) => {
  const [showModal, setShowModal] = useState(false);
  const { currentCountry } = useCountryStore();
  const isWave = type === 'wave-button';
  const provider = isWave ? 'Wave' : 'Orange Money';
  
  const getPaymentUrl = () => {
    // Si une URL spécifique est fournie, l'utiliser
    if (paymentUrl) return paymentUrl;
    
    // Sinon, utiliser les URLs par défaut avec le montant
    if (isWave) {
      return PAYMENT_URLS.WAVE + `?amount=${total.originalInFCFA}`;
    }
    return PAYMENT_URLS.ORANGE_MONEY;
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const finalPaymentUrl = getPaymentUrl();
    console.log('Payment URL:', finalPaymentUrl); // Debug log
    
    if (!finalPaymentUrl) {
      console.error('Payment URL is missing');
      return;
    }

    if (isMobile) {
      window.location.href = finalPaymentUrl;
    } else {
      setShowModal(true);
    }
  };

  // Détermine quel montant afficher
  const displayAmount = currentCountry?.currency?.code === 'XOF' 
    ? total.formatted 
    : `${total.formatted} (${total.originalInFCFA.toLocaleString()} FCFA)`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full px-4 py-4 rounded-full flex items-center justify-center gap-3 
          hover:opacity-90 transition-colors shadow-lg text-white font-medium
          text-sm md:text-lg lg:text-lg
          ${isWave ? 'bg-[#1BA7FF]' : 'bg-[#F48022]'}`}
      >
        <img
          src={`/images/payments/${isWave ? 'wave_2' : 'om_2'}.svg`}
          alt={provider}
          className="w-8 h-8"
        />
        <span>
          Payer {displayAmount} avec {provider}
        </span>
      </button>

      {showModal && !isMobile && (
        <PaymentModal
          url={getPaymentUrl()}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default PaymentButton;