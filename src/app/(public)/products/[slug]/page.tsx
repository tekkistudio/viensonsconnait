// src/app/(public)/products/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientOnly from '@/components/utils/ClientOnly';
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';
import ProductPageContent from '@/features/product/components/ProductPageContent';
import { ChatProvider } from '@/features/product/context/ChatContext';
import ProductNotFound from './not-found';

export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (typeof slug !== 'string') return;

      try {
        let loadedProduct: Product | null = null;
        console.log('Loading product with slug:', slug);

        // Vérifier si c'est un UUID (ancien format)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)) {
          loadedProduct = await productService.getProductById(slug);
          if (loadedProduct) {
            router.replace(`/products/${loadedProduct.slug}`);
            return;
          }
        } else {
          loadedProduct = await productService.getProductBySlug(slug);
        }

        if (loadedProduct) {
          console.log('Product loaded:', loadedProduct.name);
          setProduct(loadedProduct);
        } else {
          console.log('Product not found');
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug, router]);

  if (loading) {
    return null; // Le composant de chargement sera géré par loading.tsx
  }

  if (!product || typeof slug !== 'string') {
    return <ProductNotFound />;
  }

  return (
    <ClientOnly>
      <ChatProvider product={product}>
        <ProductPageContent productId={product.id} product={product} />
      </ChatProvider>
    </ClientOnly>
  );
}