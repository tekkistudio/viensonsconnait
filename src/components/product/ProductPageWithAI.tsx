// src/components/product/ProductPageWithAI.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Star, Users, Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AIMobileChatContainer from '@/components/chat/AIMobileChatContainer';
import { AIChatIntegrationService } from '@/lib/services/AIChatIntegrationService';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  target_audience: string[];
  game_rules?: string;
  benefits?: string[];
  rating?: number;
  reviews_count?: number;
  status: string;
}

interface ProductPageProps {
  product: ProductData;
  className?: string;
}

export default function ProductPageWithAI({ product, className = '' }: ProductPageProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [productStats, setProductStats] = useState({
    visitors: 0,
    sales: 0,
    loading: true
  });

  // Charger les statistiques du produit
  useEffect(() => {
    loadProductStats();
  }, [product.id]);

  const loadProductStats = async () => {
    try {
      setProductStats(prev => ({ ...prev, loading: true }));
      
      // Simuler le chargement des stats (à remplacer par vos vraies données)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Données simulées - remplacez par un appel API réel
      const stats = {
        visitors: Math.floor(Math.random() * 500) + 100,
        sales: Math.floor(Math.random() * 50) + 10,
        loading: false
      };
      
      setProductStats(stats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setProductStats(prev => ({ ...prev, loading: false }));
    }
  };

  const openChat = () => {
    setIsChatOpen(true);
    // Analytics: Track chat opening
    console.log('🤖 Chat ouvert pour produit:', product.id);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const getDiscountedPrice = (originalPrice: number) => {
    // Exemple de logique de promotion
    const discountPercentage = 10; // 10% de réduction
    return originalPrice * (1 - discountPercentage / 100);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header minimaliste mobile */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {product.name}
          </h1>
          <Badge variant="default" className="ml-2">
            ⭐ {product.rating || 4.8}
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Contenu principal mobile-first */}
        <div className="space-y-6">
          
          {/* Carrousel d'images */}
          <div className="relative">
            <div className="aspect-square md:aspect-video bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[currentImageIndex] || '/placeholder-product.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900">
                  <div className="text-center">
                    <ShoppingCart className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-600 dark:text-purple-300 font-medium">
                      {product.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Miniatures */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageChange(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Statistiques et preuve sociale */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center mb-2">
                <Eye className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Vues</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {productStats.loading ? '...' : productStats.visitors}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center mb-2">
                <ShoppingCart className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Vendus</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {productStats.loading ? '...' : productStats.sales}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Note</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {product.rating || 4.8}/5
              </p>
            </div>
          </div>

          {/* Description et prix */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Titre et avis */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= (product.rating || 4.8)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({product.reviews_count || 127} avis)
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product.description || 'Découvrez ce jeu de cartes relationnel conçu pour renforcer vos liens et créer des conversations authentiques.'}
                </p>
              </div>

              {/* Prix */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatPrice(product.price)} FCFA
                    </p>
                    {/* Prix barré si promotion */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                      {formatPrice(getDiscountedPrice(product.price) * 1.1)} FCFA
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    -10% 🔥
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton CTA principal */}
          <div className="sticky bottom-4 z-40">
            <Button
              onClick={openChat}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-lg rounded-2xl shadow-lg transform transition-transform active:scale-95"
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Ce jeu m'intéresse
            </Button>
          </div>

          {/* Bénéfices et avantages */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ✨ Pourquoi choisir ce jeu ?
            </h3>
            <div className="space-y-3">
              {(product.benefits || [
                'Renforce les liens familiaux et amicaux',
                'Crée des conversations authentiques',
                'Développé par des psychologues',
                'Adapté à la culture africaine',
                'Plus de 1000 familles satisfaites'
              ]).map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Public cible */}
          {product.target_audience && product.target_audience.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                👥 Pour qui ?
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.target_audience.map((audience, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {audience}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Garanties et confiance */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🛡️ Nos garanties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Satisfait ou remboursé 30 jours
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Livraison rapide et sécurisée
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Support client réactif
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Paiement 100% sécurisé
                </span>
              </div>
            </div>
          </div>

          {/* Témoignages clients */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              ⭐ Avis de nos clients
            </h3>
            <div className="space-y-4">
              {[
                {
                  name: "Fatou D.",
                  location: "Dakar",
                  rating: 5,
                  comment: "Excellent jeu ! Ma famille passe des soirées incroyables grâce à ces cartes. Nos conversations sont devenues plus profondes.",
                  verified: true
                },
                {
                  name: "Mamadou S.",
                  location: "Abidjan",
                  rating: 5,
                  comment: "J'ai acheté ce jeu pour ma femme et moi. Cela nous a vraiment rapprochés. Je recommande vivement !",
                  verified: true
                },
                {
                  name: "Aïcha M.",
                  location: "Bamako",
                  rating: 4,
                  comment: "Mes enfants adorent jouer avec nous. C'est devenu notre rituel du dimanche en famille.",
                  verified: true
                }
              ].map((review, index) => (
                <div key={index} className="border-l-4 border-purple-400 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {review.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        • {review.location}
                      </span>
                      {review.verified && (
                        <Badge variant="default" className="text-xs">
                          ✓ Vérifié
                        </Badge>
                      )}
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer produit */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🌟 Prêt(e) à transformer vos relations ?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rejoignez plus de 1000 familles qui ont déjà découvert la magie de nos jeux !
            </p>
            <Button
              onClick={openChat}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Parler avec Rose, notre conseillère
            </Button>
          </div>

          {/* Espace pour éviter que le contenu ne soit masqué par le bouton sticky */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Chat IA Modal */}
      <AIMobileChatContainer
        isOpen={isChatOpen}
        onClose={closeChat}
        productId={product.id}
        sessionId={sessionId}
        className="z-50"
      />

      {/* Version Desktop - Bouton de chat flottant */}
      {!isChatOpen && (
        <div className="hidden md:block fixed bottom-6 right-6 z-40">
          <Button
            onClick={openChat}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transform transition-all hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {/* Bulle d'information */}
          <div className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 w-64 transform translate-x-4 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-300 font-semibold text-sm">R</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  Rose - Conseillère
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Besoin d'aide ? Je suis là pour vous conseiller !
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}