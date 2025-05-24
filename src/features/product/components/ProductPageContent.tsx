// src/features/product/components/ProductPageContent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import { useLayoutContext } from '@/core/context/LayoutContext';
import type { Product } from '@/types/product';
import dynamic from 'next/dynamic';
import ProductTestimonials from './ProductTestimonials';

// Composant de fallback pour les images
const ProductPlaceholder = () => (
  <div className="aspect-square bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
    <div className="w-16 h-16 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  </div>
);

// Imports dynamiques avec fallbacks
const ProductImageGallery = dynamic(() => import('./ProductImageGallery'), {
  ssr: false,
  loading: () => <ProductPlaceholder />
});

const ChatContainer = dynamic(() => import('./ProductChat/ChatContainer'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse">
      <div className="h-16 bg-white border-b" />
    </div>
  ),
});

const MobileChatContainer = dynamic(() => import('./ProductChat/components/MobileChatContainer'), {
  ssr: false
});

const RelatedProducts = dynamic(() => import('./RelatedProducts'), {
  ssr: false
});

interface ProductPageContentProps {
  productId: string;
  product: Product;
}

const getDefaultProductImages = (productId: string): string[] => {
  return [
    `/images/products/${productId}-1.jpg`,
    `/images/products/${productId}-2.jpg`
  ];
};

// ID du store par défaut pour VOSC
const VOSC_STORE_ID = 'a9563f88-217c-4998-b080-ed39f637ea31';

export default function ProductPageContent({ productId, product }: ProductPageContentProps) {
  const { isMobile } = useBreakpoint();
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const { setHideDukkaBadge } = useLayoutContext();

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
                productId={product.id}
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

          <ProductTestimonials productId={product.id} />

          <div className="px-4 mt-8">
            <RelatedProducts
              currentProductId={product.id}
              productCategory={product.category}
            />
          </div>
        </div>

        {isChatFullscreen && (
          <div className="fixed inset-0 bg-white z-[100]">
            <MobileChatContainer
              product={product}
              storeId={VOSC_STORE_ID}
              onBackClick={() => setIsChatFullscreen(false)}
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
              productId={product.id}
            />
          </div>
          <div className="lg:w-7/12 h-full">
            <ChatContainer
              product={product}
              storeId={VOSC_STORE_ID}
              isMobile={false}
              isFullscreen={false}
            />
          </div>
        </div>

      {/*  <ProductTestimonials productId={product.id} /> */}

        <RelatedProducts
          currentProductId={product.id}
          productCategory={product.category}
        />
      </div>
    </main>
  );
}