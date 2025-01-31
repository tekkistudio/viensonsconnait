// src/features/product/components/ProductPageContent.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import { useLayoutContext } from '../../../core/context/LayoutContext';
import type { Product } from '../../../types/product';
import dynamic from 'next/dynamic';
import products from '@/lib/products';

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

const MobileChatContainer = dynamic(
  () => import('./ProductChat/components/MobileChatContainer'),
  { ssr: false }
);

const RelatedProducts = dynamic(() => import('./RelatedProducts'), {
  ssr: false
});

interface ProductPageContentProps {
  product: Product;
}

export default function ProductPageContent({ product }: ProductPageContentProps) {
    const { isMobile } = useBreakpoint();
    const [isChatFullscreen, setIsChatFullscreen] = useState(false);
    const { setHideDukkaBadge } = useLayoutContext();
  const chatRef = useRef<HTMLDivElement>(null!);

  // Gérer l'affichage du badge Dukka
  useEffect(() => {
    setHideDukkaBadge(isChatFullscreen);
    return () => setHideDukkaBadge(false);
  }, [isChatFullscreen, setHideDukkaBadge]);

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

        {isChatFullscreen && (
          <div className="fixed inset-0 bg-white z-[100]">
            <MobileChatContainer
              onBackClick={() => setIsChatFullscreen(false)}
              chatRef={chatRef}
              product={product}
            />
          </div>
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