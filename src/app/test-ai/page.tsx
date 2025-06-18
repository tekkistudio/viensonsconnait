// src/app/test-ai/page.tsx - PAGE DE TEST AGENT IA

'use client';

import { useState } from 'react';
import ProductPageWithAI from '@/components/product/ProductPageWithAI';
import { Button } from '@/components/ui/button';

// Produit de test
const testProduct = {
  id: 'test-product-ai',
  name: 'VIENS ON S\'CONNAÎT - Couples',
  description: 'Un jeu de cartes relationnel conçu pour renforcer les liens entre partenaires et créer des conversations authentiques.',
  price: 15000,
  images: ['/placeholder-product.jpg'],
  category: 'romance',
  target_audience: ['couples', 'adultes'],
  game_rules: 'Piochez une carte à tour de rôle et répondez aux questions. L\'objectif est d\'avoir des conversations profondes et bienveillantes. Durée : 30 minutes à 2 heures selon vos envies.',
  benefits: [
    'Renforce la complicité dans le couple',
    'Améliore la communication',
    'Crée des moments d\'intimité',
    'Découvrez votre partenaire sous un nouveau jour'
  ],
  rating: 4.8,
  reviews_count: 127,
  status: 'active'
};

export default function TestAIPage() {
  const [showTest, setShowTest] = useState(false);

  if (!showTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🤖 Test Agent IA VIENS ON S'CONNAÎT
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Prêt à tester votre nouvel Agent IA conversationnel ?
          </p>
          <Button 
            onClick={() => setShowTest(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            🚀 Lancer le test
          </Button>
          
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p><strong>Ce test va :</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Charger la page produit avec l'IA</li>
              <li>Tester le chat conversationnel</li>
              <li>Vérifier le flux de commande</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <ProductPageWithAI product={testProduct} />;
}