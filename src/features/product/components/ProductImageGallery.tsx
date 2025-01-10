// src/features/product/components/ProductImageGallery.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Eye, ShoppingBag } from 'lucide-react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import type { Product } from '../../../types/product';

interface ProductImageGalleryProps {
  images: string[];
  name: string;
  stats?: Product['stats'];
}

const generateViewerCount = (productName: string): number => {
  const hash = productName.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return Math.max(12, (hash % 56) + 12);
};

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export default function ProductImageGallery({ images, name, stats }: ProductImageGalleryProps) {
  const { isMobile } = useBreakpoint();
  const [[page, direction], setPage] = useState([0, 0]);
  const [showZoom, setShowZoom] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageIndex = wrap(0, images.length, page);

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  // Suppression du préchargement des images qui causait l'erreur

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
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm">
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
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-full h-full">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-100 animate-pulse" />
                )}
                <Image
                  src={images[imageIndex]}
                  alt={`${name} - Vue ${imageIndex + 1}`}
                  fill
                  className={`object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes={isMobile ? "100vw" : "(max-width: 1024px) 50vw, 33vw"}
                  priority={imageIndex === 0}
                  quality={90}
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

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-4 px-4' : 'grid-cols-4'}`}>
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
              src={img}
              alt={`${name} - Miniature ${idx + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 15vw"
              quality={80}
            />
          </motion.button>
        ))}
      </div>

      {stats && (
        <div className={`flex items-center justify-between text-sm text-gray-600 ${
          isMobile ? 'px-4' : ''
        }`}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>{generateViewerCount(name)} personnes consultent ce jeu</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span>{stats?.sold ? stats.sold.toLocaleString() : '0'} ventes</span>
          </div>
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
                src={images[imageIndex]}
                alt={`${name} - Vue ${imageIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                quality={95}
                priority
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