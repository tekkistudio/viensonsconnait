// src/components/ui/ProgressIndicator.tsx
import React from 'react';
import { ConversationStep } from '@/types/chat';

interface ProgressIndicatorProps {
  currentStep: ConversationStep;
}

// Mapping des étapes vers un index séquentiel
const PURCHASE_FLOW_STEPS: Record<string, number> = {
  'collect_quantity': 1,
  'collect_name': 2,
  'collect_phone': 3,
  'check_existing': 4,
  'collect_city': 5,
  'collect_address': 6,
  'collect_email_opt': 7,
  'collect_email': 8,
  'recommend_products': 9,
  'select_product': 10,
  'additional_quantity': 11,
  'order_summary': 12,
  'payment_method': 13,
  'payment_processing': 14,
  'payment_complete': 15
};

// Total d'étapes maximum dans le flow
const TOTAL_STEPS = 15;

// Étapes du flow d'achat
const purchaseFlowStepSet = new Set(Object.keys(PURCHASE_FLOW_STEPS));

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep }) => {
  // Vérifier si l'étape fait partie du flow d'achat
  const isInPurchaseFlow = purchaseFlowStepSet.has(currentStep);
  
  // Ne pas afficher l'indicateur pour les étapes hors flow d'achat
  if (!isInPurchaseFlow) {
    return null;
  }
  
  // Obtenir l'index de l'étape actuelle
  const stepIndex = PURCHASE_FLOW_STEPS[currentStep] || 0;
  
  // Calculer le pourcentage de progression
  const progressPercentage = Math.max(0, Math.min(100, (stepIndex / TOTAL_STEPS) * 100));
  
  return (
    <div className="w-full mt-2 mb-4">
      <div className="w-full bg-gray-200 h-1.5 rounded-full">
        <div 
          className="h-1.5 rounded-full bg-pink-400 transition-all duration-500 ease-in-out" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500 text-right">
        Étape {stepIndex}/{TOTAL_STEPS}
      </div>
    </div>
  );
};

export default ProgressIndicator;