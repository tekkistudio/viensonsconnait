import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { Star } from 'lucide-react';
import { Product } from '../../../types/product';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import useCountryStore from '../../../core/hooks/useCountryStore';

interface RelatedProductsProps {
  currentProductId: string;
  products: Product[];
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ currentProductId, products }) => {
  const { isMobile } = useBreakpoint();
  const { convertPrice } = useCountryStore();
  const relatedProducts = products.filter(p => p.id !== currentProductId).slice(0, 3);

  return (
    <div className="mt-12 pt-6">
      <h2 className="text-2xl font-bold text-[#132D5D] mb-6">Nos Clients Aiment Aussi...</h2>
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {relatedProducts.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`}>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                  sizes={
                    isMobile
                ? "(max-width: 640px) 50vw, 100vw"
                : "(max-width: 1024px) 33vw, 25vw"
                  }
                quality={85}
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
                          className="w-4 h-4 fill-[#FF7E93] text-[#FF7E93]"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({product.stats?.reviews || 0} avis)
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
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;