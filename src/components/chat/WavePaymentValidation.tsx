// src/components/chat/WavePaymentValidation.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, AlertCircle } from 'lucide-react';

interface WavePaymentValidationProps {
  orderId: string;
  amount: number;
  onValidationSubmit: (transactionId: string) => void;
  onRetry: () => void;
}

const WavePaymentValidation: React.FC<WavePaymentValidationProps> = ({
  orderId,
  amount,
  onValidationSubmit,
  onRetry
}) => {
  const [transactionId, setTransactionId] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const validateTransactionId = (id: string): boolean => {
    // Vérifier que l'ID commence par T et fait entre 13-17 caractères
    const regex = /^T[A-Z0-9]{12,16}$/;
    return regex.test(id.toUpperCase());
  };

  const handleSubmit = async () => {
    const cleanId = transactionId.trim().toUpperCase();
    
    if (!cleanId) {
      setError('Veuillez entrer l\'ID de transaction');
      return;
    }

    if (!validateTransactionId(cleanId)) {
      setError('Format d\'ID invalide. L\'ID doit commencer par T et contenir 13-17 caractères (ex: TW5UO25V7VEEV4IBN)');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      await onValidationSubmit(cleanId);
    } catch (error) {
      setError('Erreur lors de la validation. Veuillez réessayer.');
    } finally {
      setIsValidating(false);
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#4BD2FA] rounded-xl p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#4BD2FA] rounded-full flex items-center justify-center mx-auto mb-4">
          <ExternalLink className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Finaliser le paiement Wave
        </h3>
        <p className="text-sm text-gray-600">
          Montant : <span className="font-semibold">{amount.toLocaleString()} FCFA</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-2">Instructions :</p>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Effectuez le paiement sur Wave</li>
                <li>Notez l'ID de transaction (commence par T)</li>
                <li>Saisissez l'ID ci-dessous pour validation</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            N° Commande (pour référence)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={orderId}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            <button
              onClick={copyOrderId}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Copier le numéro de commande"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            ID de Transaction Wave *
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => {
              setTransactionId(e.target.value);
              setError('');
            }}
            placeholder="Ex: TW5UO25V7VEEV4IBN"
            className={`w-full px-3 py-2 border rounded-lg text-sm font-mono tracking-wide
              ${error ? 'border-red-300' : 'border-gray-300'} 
              focus:outline-none focus:ring-2 focus:ring-[#4BD2FA] focus:border-[#4BD2FA]`}
            maxLength={17}
          />
          {error && (
            <p className="text-red-600 text-xs mt-1">{error}</p>
          )}
          <p className="text-xs text-gray-500">
            L'ID de transaction se trouve sur votre reçu Wave
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isValidating || !transactionId.trim()}
            className="flex-1 px-4 py-2 bg-[#4BD2FA] text-white rounded-lg hover:bg-[#3BC1E9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isValidating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Validation...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Valider
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default WavePaymentValidation;