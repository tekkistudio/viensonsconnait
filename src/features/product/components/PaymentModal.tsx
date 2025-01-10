// src/features/product/components/PaymentModal.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  iframeUrl?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, iframeUrl }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (iframeUrl) {
      setIsLoading(true);
    }
  }, [iframeUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh]">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E93]" />
            <span className="ml-2 text-gray-700">Chargement du paiement...</span>
          </div>
        )}
        
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className={`w-full h-full border-0 ${isLoading ? 'hidden' : 'block'}`}
            onLoad={() => setIsLoading(false)}
            title="Paiement"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};