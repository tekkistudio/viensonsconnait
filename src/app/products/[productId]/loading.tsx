// src/app/products/[productId]/loading.tsx
'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93]"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}