// src/app/(public)/products/[productId]/page.tsx
'use client';

import ClientOnly from '@/components/utils/ClientOnly';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { products } from '@/lib/products';
import { ChatProvider } from '@/features/product/context/ChatContext';
import { ProductId, isValidProduct } from '@/config/products';
import type { Product } from '@/types/product';

const ProductPage = dynamic(
  () => import('@/features/product/components/ProductPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93]" />
      </div>
    ),
  }
);

export default function Page() {
  const { productId } = useParams();
  
  if (typeof productId !== 'string' || !isValidProduct(productId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Produit non trouvé</p>
      </div>
    );
  }

  const product = products[productId as ProductId];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Produit non trouvé</p>
      </div>
    );
  }

  const fullProduct = {
    ...product,
    id: productId as ProductId
  };

  return (
    <ChatProvider product={fullProduct}>
      <ClientOnly>
        <ProductPage />
      </ClientOnly>
    </ChatProvider>
  );
}