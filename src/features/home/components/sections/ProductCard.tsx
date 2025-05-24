// src/features/home/components/sections/ProductCard.tsx
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useCountryStore from "@/core/hooks/useCountryStore";
import type { Product } from "@/types/product";
import { getProductImages, generateImageProps } from "@/utils/image";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  isMobile?: boolean;
}

export default function ProductCard({
  product,
  priority = false,
  isMobile = false,
}: ProductCardProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();

  const images = getProductImages(product);
  const primaryImage = images[0];
  const secondaryImage = images[1] || images[0];

  const formattedPrice = convertPrice(product.price)?.formatted;
  const formattedCompareAtPrice = product.compareAtPrice 
    ? convertPrice(product.compareAtPrice)?.formatted 
    : null;

  const handleNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    const productUrl = `/products/${product.slug || product.id}`;
    router.push(productUrl);
    // Forcer le scroll en haut de la page
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
      <a href={`/products/${product.slug || product.id}`} onClick={handleNavigation} className="block">
        <div className="relative aspect-square w-full group">
          <div className="absolute inset-0 transition duration-300 ease-in-out group-hover:opacity-0">
            <Image
              {...generateImageProps(primaryImage, `${product.name} - Vue principale`, priority)}
              fill
              className="object-contain"
              sizes={
                isMobile
                  ? "(max-width: 640px) 50vw, 100vw"
                  : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              }
            />
          </div>

          <div className="absolute inset-0 opacity-0 transition duration-300 ease-in-out group-hover:opacity-100">
            <Image
              {...generateImageProps(secondaryImage, `${product.name} - Vue alternative`)}
              fill
              className="object-contain"
              sizes={
                isMobile
                  ? "(max-width: 640px) 50vw, 100vw"
                  : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              }
            />
          </div>

          {product.badges && product.badges.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
              {product.badges.map((badge, index) => (
                <Badge 
                  key={index} 
                  variant={badge.type}
                  className="font-medium"
                >
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </a>

      <div className="p-4">
        <a href={`/products/${product.slug || product.id}`} onClick={handleNavigation} className="block">
          <h3 className={`${
            isMobile ? "text-base" : "text-xl"
          } font-bold text-brand-blue hover:text-brand-pink transition-colors`}>
            {product.name}
          </h3>
          {!isMobile && (
            <p className="text-gray-600 mt-2 line-clamp-2">
              {product.description}
            </p>
          )}
        </a>

        <div className="flex justify-between items-center mt-4">
          <div className="flex flex-col">
            {formattedCompareAtPrice && (
              <span className="text-gray-500 line-through text-sm">
                {formattedCompareAtPrice}
              </span>
            )}
            {formattedPrice && (
              <span
                suppressHydrationWarning
                className={`${
                  isMobile ? "text-base" : "text-xl"
                } font-bold text-brand-blue`}
              >
                {formattedPrice}
              </span>
            )}
          </div>
          {!isMobile && (
            <a
              href={`/products/${product.slug || product.id}`}
              onClick={handleNavigation}
              className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-pink transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Voir ce jeu</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}