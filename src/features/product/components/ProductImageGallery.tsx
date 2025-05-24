// src/features/product/components/ProductImageGallery.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import type { Product } from '@/types/product';
import { generateImageProps } from '@/utils/image';
import ProductStats from './ProductChat/components/ProductStats';

interface ProductImageGalleryProps {
  images: string[];
  name: string;
  stats?: Product['stats'];
  productId: string;
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export default function ProductImageGallery({ 
  images = [], 
  name, 
  stats,
  productId
}: ProductImageGalleryProps) {
  const { isMobile } = useBreakpoint();
  const [[page, direction], setPage] = useState([0, 0]);
  const [showZoom, setShowZoom] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageIndex = wrap(0, images.length, page);

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    const time = e.timeStamp;
    const velocity = Math.abs(deltaX) / time;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && velocity > VELOCITY_THRESHOLD) {
        paginate(deltaX > 0 ? -1 : 1);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F8F9FA] shadow-sm">
        <div className="absolute inset-0">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={page}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? '100%' : '-100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction < 0 ? '100%' : '-100%' }}
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.15 }
              }}
              className="absolute inset-0 bg-[#F8F9FA]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-full h-full">
                <Image
                  {...generateImageProps(images[imageIndex], `${name} - Vue ${imageIndex + 1}`, imageIndex === 0)}
                  fill
                  className="object-contain transition-all duration-300"
                  sizes={isMobile ? "100vw" : "(max-width: 1024px) 50vw, 33vw"}
                  priority={imageIndex === 0}
                  loading={imageIndex === 0 ? "eager" : "lazy"}
                  quality={95}
                  onLoad={() => setImageLoaded(true)}
                  onClick={() => !isMobile && setShowZoom(true)}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {!isMobile && (
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(-1);
              }}
              className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-10"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(1);
              }}
              className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-10"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
          {imageIndex + 1}/{images.length}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-4">
        {images.map((img, idx) => (
          <motion.button
            key={idx}
            onClick={() => {
              const direction = idx > imageIndex ? 1 : -1;
              setPage([idx, direction]);
            }}
            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${
              imageIndex === idx ? 'ring-2 ring-[#FF7E93]' : ''
            }`}
            whileHover={!isMobile ? { scale: 1.05 } : undefined}
            whileTap={{ scale: 0.95 }}
          >
            <Image
              {...generateImageProps(img, `${name} - Miniature ${idx + 1}`)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 15vw"
              quality={75}
            />
          </motion.button>
        ))}
      </div>

      {stats && (
        <div className="text-sm text-gray-600">
          <ProductStats 
            productId={productId}
            initialStats={{
              sold: stats.sold || 0,
              currentViewers: stats.currentViewers || 0
            }} 
          />
        </div>
      )}

      <AnimatePresence>
        {showZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setShowZoom(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-[90vw] h-[90vh]"
            >
              <Image
                {...generateImageProps(images[imageIndex], `${name} - Vue ${imageIndex + 1}`, true)}
                fill
                className="object-contain"
                sizes="100vw"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowZoom(false);
                }}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}