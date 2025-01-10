// src/app/products/[productId]/page.tsx
'use client';

import ClientOnly from '../../../components/utils/ClientOnly';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { products } from '../../../lib/products';
import { ChatProvider } from '../../../features/product/context/ChatContext';

const ProductPage = dynamic(
  () => import('../../../features/product/components/ProductPage'),
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
  const product = productId && typeof productId === 'string' ? products[productId] : null;

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Produit non trouvé</p>
      </div>
    );
  }

  return (
    <ChatProvider product={product}>
      <ClientOnly>
        <ProductPage />
      </ClientOnly>
    </ChatProvider>
  );
}