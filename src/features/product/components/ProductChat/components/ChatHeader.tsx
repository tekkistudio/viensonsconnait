// src/features/product/components/ProductChat/components/ChatHeader.tsx
import React, { useEffect, useState } from 'react';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import type { RealTimeStats } from '@/types/product';

interface ChatHeaderProps {
  productId: string;
  title: string;
  rating: number;
  price: string;
  oldPrice?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  productId, 
  title, 
  rating: initialRating, 
  price, 
  oldPrice 
}) => {
  // Log pour debug
  console.log('ChatHeader props:', {
    productId,
    title,
    rating: initialRating,
    price,
    oldPrice
  });

  const { convertPrice } = useCountryStore();
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(initialRating);

  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      if (!productId) {
        console.error('ChatHeader: productId is missing');
        return;
      }

      try {
        console.log('ChatHeader: Fetching stats for productId:', productId);

        const [statsResult, reviewsCount, averageRating] = await Promise.all([
          productStatsService.getProductStats(productId),
          testimonialsService.getTestimonialsCountByProduct(productId),
          testimonialsService.getAverageRating(productId)
        ]);

        console.log('ChatHeader: Stats loaded:', {
          statsResult,
          reviewsCount,
          averageRating
        });

        if (!isSubscribed) return;

        setStats({
          viewsCount: statsResult.totalViews || 0,
          salesCount: statsResult.sold || 0,
          reviewsCount: reviewsCount || 0
        });

        if (averageRating > 0) {
          setRating(averageRating);
        }
      } catch (error) {
        console.error('ChatHeader: Error loading stats:', error);
      }
    };

    initializeStats();

    if (productId) {
      productStatsService.incrementViewCount(productId);
    }

    return () => {
      isSubscribed = false;
    };
  }, [productId]);

  const formattedPrice = typeof price === 'string' 
    ? convertPrice(parseInt(price.replace(/[^0-9]/g, ''))).formatted
    : price;

  const formattedOldPrice = oldPrice
    ? convertPrice(parseInt(oldPrice.replace(/[^0-9]/g, ''))).formatted
    : undefined;

  return (
    <div className="bg-white py-4 px-6 border-b">
      <h1 className="text-2xl font-bold text-[#132D5D] mb-2">{title}</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < rating 
                      ? 'text-[#FF7E93] fill-[#FF7E93]' 
                      : 'text-gray-300'
                  }`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              ({stats.reviewsCount} avis)
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-[#132D5D]">{formattedPrice}</span>
          {formattedOldPrice && (
            <span className="text-sm text-gray-500 line-through">
              {formattedOldPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;