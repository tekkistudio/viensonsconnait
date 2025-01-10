// src/features/home/components/sections/ProductCard.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import useCountryStore from "../../../../core/hooks/useCountryStore";
import type { Product } from "../../../../types/product";

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
  const { convertPrice } = useCountryStore();
  const primaryImage = product.media?.[0]?.url;
  const secondaryImage = product.media?.[1]?.url;

  const formattedPrice = convertPrice(product.price)?.formatted;
  const formattedCompareAtPrice = product.compareAtPrice 
    ? convertPrice(product.compareAtPrice)?.formatted 
    : null;

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square w-full group">
        {primaryImage && (
  <div className="absolute inset-0 transition duration-300 ease-in-out group-hover:opacity-0">
    <Image
      src={primaryImage}
      alt={product.media?.[0]?.alt || product.name}
      fill
      className="object-contain"
      priority={priority}
      sizes={
        isMobile
          ? "(max-width: 640px) 50vw, 100vw"
          : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      }
      quality={85}
    />
  </div>
)}
{secondaryImage && (
  <div className="absolute inset-0 opacity-0 transition duration-300 ease-in-out group-hover:opacity-100">
    <Image
      src={secondaryImage}
      alt={product.media?.[1]?.alt || `${product.name} - Vue alternative`}
      fill
      className="object-contain"
      sizes={
        isMobile
          ? "(max-width: 640px) 50vw, 100vw"
          : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      }
      quality={85}
    />
  </div>
)}
          {product.badges && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
              {product.badges.map((badge, index) => (
                <Badge key={index} variant={badge.type}>
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/products/${product.id}`} className="block">
          <h3
            className={`${
              isMobile ? "text-base" : "text-xl"
            } font-bold text-brand-blue hover:text-brand-pink transition-colors`}
          >
            {product.name}
          </h3>
          {!isMobile && (
            <p className="text-gray-600 mt-2 line-clamp-2">{product.description}</p>
          )}
        </Link>
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
            <Link
              href={`/products/${product.id}`}
              className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-pink transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Voir ce jeu</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}