// src/features/product/components/ProductPage.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import useCountryStore from '../../../core/hooks/useCountryStore';
import { products } from '../../../lib/products';
import type { Product } from '../../../types/product';
import { useChatContext } from '../context/ChatContext';
import { useLayoutContext } from '../../../core/context/LayoutContext';

// Chargement dynamique des composants
const MobileChatContainer = dynamic(
  () => import('./ProductChat/components/MobileChatContainer'),
  { ssr: false }
);

const ProductImageGallery = dynamic(() => import('./ProductImageGallery'), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
  ),
});

const ChatContainer = dynamic(() => import('./ProductChat/ChatContainer'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse">
      <div className="h-16 bg-white border-b" />
    </div>
  ),
});

const RelatedProducts = dynamic(() => import('./RelatedProducts'), {
  ssr: false
});

export default function ProductPage() {
  const { isMobile } = useBreakpoint();
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const { setHideDukkaBadge } = useLayoutContext();
  const [isClient, setIsClient] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');

  const { state, handleUserChoice } = useChatContext();
  const { messages, isTyping } = state;

  // Gérer l'affichage du badge Dukka
  useEffect(() => {
    setHideDukkaBadge(isChatFullscreen);
    return () => setHideDukkaBadge(false);
  }, [isChatFullscreen, setHideDukkaBadge]);

  // Initialisation du produit
  useEffect(() => {
    setIsClient(true);
    if (productId && typeof productId === 'string') {
      const foundProduct = products[productId];
      if (foundProduct) {
        setProduct(foundProduct);
      }
    }
  }, [productId]);

  // Gérer l'envoi de message
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    handleUserChoice(inputMessage);
    setInputMessage('');
  };

  // Scroll automatique
  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isClient || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93]" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] pt-4 pb-4">
        <div className={`${isChatFullscreen ? 'hidden' : 'block'}`}>
          <div className="pb-16">
            <div className="px-4">
              <ProductImageGallery
                images={product.images}
                name={product.name}
                stats={product.stats}
              />

              <button
                onClick={() => setIsChatFullscreen(true)}
                className="w-full mx-auto mt-6 bg-[#FF7E93] text-white py-4 px-8 rounded-full flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">Ce jeu m'intéresse</span>
              </button>
            </div>
          </div>

          <div className="px-4 mt-8">
            <RelatedProducts
              currentProductId={product.id}
              products={Object.values(products)}
            />
          </div>
        </div>

        {isChatFullscreen && product && (
          <MobileChatContainer
            onBackClick={() => setIsChatFullscreen(false)}
            chatRef={chatRef}
            product={product}  
          />
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-5/12">
            <ProductImageGallery
              images={product.images}
              name={product.name}
              stats={product.stats}
            />
          </div>
          <div className="lg:w-7/12 h-full">
            <ChatContainer
              product={product}
              isMobile={false}
              isFullscreen={false}
            />
          </div>
        </div>

        <RelatedProducts
          currentProductId={product.id}
          products={Object.values(products)}
        />
      </div>
    </main>
  );
}