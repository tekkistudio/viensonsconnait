'use client';

import React from 'react';
import SmartChatContainer from '../../../features/product/components/chat/smart/SmartChatContainer';
import ChatProvider from '../../../features/product/context/ChatContext';
import type { ProductId } from '../../../features/product/utils/chatMessages';
import type { Product } from '../../../types/product';

const testProduct: { id: ProductId } & Product = {
    id: 'couples',
    slug: 'entre-couples',
    name: 'Entre Couples',
    description: "Jeu de cartes pour les couples",
    price: 14000,
    compareAtPrice: 17000,
    images: [],
    stats: {
      sold: 250,
      satisfaction: 4.8,
      reviews: 128
    }
  };

export default function TestChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test Chat</h1>
        <div className="bg-white rounded-xl shadow-sm h-[600px]">
          <ChatProvider product={testProduct}>
            <SmartChatContainer />
          </ChatProvider>
        </div>
      </div>
    </div>
  );
}