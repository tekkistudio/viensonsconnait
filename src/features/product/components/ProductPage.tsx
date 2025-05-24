// src/features/product/components/ProductPage.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ClientOnly from '@/components/utils/ClientOnly';
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';
import ProductPageContent from './ProductPageContent';
import { useRouter } from 'next/navigation';

export default function ProductPage() {
  const { productId } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (typeof productId !== 'string') {
        router.push('/products');
        return;
      }

      try {
        const loadedProduct = await productService.getProductById(productId);
        if (loadedProduct) {
          setProduct(loadedProduct);
        } else {
          router.push('/products');
        }
      } catch (error) {
        console.error('Failed to load product:', error);
        router.push('/products');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93]" />
      </div>
    );
  }

  if (!product || typeof productId !== 'string') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Produit non trouvé</p>
      </div>
    );
  }

  return (
    <ClientOnly>
      <ProductPageContent productId={productId} product={product} />
    </ClientOnly>
  );
}