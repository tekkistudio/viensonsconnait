// src/features/product/components/RelatedProducts.tsx
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productService } from '@/lib/services/product.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { getProductImages, generateImageProps } from '@/utils/image';

interface RelatedProductsProps {
  currentProductId: string;
  productCategory: string;
}

interface ProductWithReviews extends Product {
  reviewsCount?: number;
  averageRating?: number;
}

export default function RelatedProducts({
  currentProductId,
  productCategory
}: RelatedProductsProps) {
  const { isMobile } = useBreakpoint();
  const { convertPrice } = useCountryStore();
  const [relatedProducts, setRelatedProducts] = useState<ProductWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadRelatedProducts() {
      setLoading(true);
      try {
        // Charger les produits liés
        const products = await productService.getRelatedProducts(
          currentProductId, 
          productCategory
        );

        // Charger les témoignages pour chaque produit
        const productsWithReviews = await Promise.all(
          products.map(async (product) => {
            const [reviewsCount, averageRating] = await Promise.all([
              testimonialsService.getTestimonialsCountByProduct(product.id),
              testimonialsService.getAverageRating(product.id)
            ]);

            return {
              ...product,
              reviewsCount,
              averageRating: averageRating || 5 // Utiliser 5 comme note par défaut
            };
          })
        );

        setRelatedProducts(productsWithReviews);
      } catch (error) {
        console.error('Failed to load related products:', error);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    }

    if (currentProductId && productCategory) {
      loadRelatedProducts();
    }
  }, [currentProductId, productCategory]);

  const handleProductClick = (productId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/products/${productId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="mt-12 pt-6">
        <h2 className="text-2xl font-bold text-[#132D5D] mb-6">
          Nos Clients Aiment Aussi...
        </h2>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-6">
      <h2 className="text-2xl font-bold text-[#132D5D] mb-6">
        Nos Clients Aiment Aussi...
      </h2>
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {relatedProducts.map((product, index) => {
          const images = getProductImages(product);
          
          return (
            <div
              key={product.id}
              onClick={handleProductClick(product.id)}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="relative aspect-square">
                <Image
                  {...generateImageProps(images[0], product.name, index === 0)}
                  fill
                  className="object-cover"
                  sizes={isMobile ? "50vw" : "33vw"}
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#132D5D]">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (product.averageRating || 5) 
                              ? 'fill-[#FF7E93] text-[#FF7E93]' 
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({product.reviewsCount || 0} avis)
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  {product.compareAtPrice && (
                    <span className="text-sm text-gray-500 line-through mr-2">
                      {convertPrice(product.compareAtPrice).formatted}
                    </span>
                  )}
                  <span className="font-bold text-[#132D5D]">
                    {convertPrice(product.price).formatted}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}