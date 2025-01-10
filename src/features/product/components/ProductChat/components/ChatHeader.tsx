// src/features/product/components/ProductChat/components/ChatHeader.tsx
import React from 'react';
import useCountryStore from '../../../../../core/hooks/useCountryStore';

interface ChatHeaderProps {
  title: string;
  rating: number;
  price: string;
  oldPrice?: string;
  reviews: number;  
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ title, rating, price, oldPrice, reviews }) => {
  const { convertPrice } = useCountryStore();
  const formattedPrice = convertPrice(parseInt(price.replace(/[^0-9]/g, ''))).formatted;
  const formattedOldPrice = oldPrice ? convertPrice(parseInt(oldPrice.replace(/[^0-9]/g, ''))).formatted : undefined;

  return (
    <div className="bg-white py-4 px-6 border-b">
      <h1 className="text-2xl font-bold text-[#132D5D] mb-2">{title}</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-[#FF7E93] fill-[#FF7E93]' : 'text-gray-300'}`}
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-gray-600">({reviews} avis)</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-[#132D5D]">{formattedPrice}</span>
          {formattedOldPrice && <span className="text-sm text-gray-500 line-through">{formattedOldPrice}</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;