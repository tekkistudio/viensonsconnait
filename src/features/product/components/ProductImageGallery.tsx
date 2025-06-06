// src/features/product/components/ProductImageGallery.tsx - VERSION FONCTIONNELLE AVEC VIDÉO
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Play, Pause } from 'lucide-react';
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

interface MediaItem {
  type: 'image' | 'video';
  src: string;
  thumbnail?: string;
  alt: string;
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // ✅ NOUVEAU: Traitement des médias (images + vidéos)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  
  useEffect(() => {
    const processedMedia: MediaItem[] = images.map((src, index) => {
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(src);
      return {
        type: isVideo ? 'video' : 'image',
        src,
        thumbnail: isVideo ? src.replace(/\.(mp4|webm|ogg|mov)$/i, '_thumb.jpg') : src,
        alt: `${name} - Vue ${index + 1}`
      };
    });
    
    setMediaItems(processedMedia);
  }, [images, name]);
  
  const mediaIndex = wrap(0, mediaItems.length, page);
  const currentMedia = mediaItems[mediaIndex];

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
    setIsVideoPlaying(false); // ✅ NOUVEAU: Pause vidéo lors du changement
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

  // ✅ NOUVEAU: Fonction pour contrôler la vidéo
  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  // ✅ Protection contre les erreurs si pas de médias
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 text-gray-400 mx-auto mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Images en cours de chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ Carrousel principal - base de l'ancienne version qui fonctionne */}
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
                {/* ✅ NOUVEAU: Rendu conditionnel image/vidéo */}
                {currentMedia?.type === 'video' ? (
                  // ✅ Support vidéo
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      src={currentMedia.src}
                      className="w-full h-full object-contain"
                      controls={false}
                      autoPlay={false}
                      muted
                      loop
                      poster={currentMedia.thumbnail}
                      onClick={() => !isMobile && setShowZoom(true)}
                    />
                    
                    {/* Contrôles vidéo personnalisés */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideo();
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all duration-300"
                      aria-label={isVideoPlaying ? "Mettre en pause" : "Lire la vidéo"}
                    >
                      <div className="bg-white/95 rounded-full p-4 shadow-xl">
                        {isVideoPlaying ? (
                          <Pause className="w-8 h-8 text-gray-800" />
                        ) : (
                          <Play className="w-8 h-8 text-gray-800 ml-1" />
                        )}
                      </div>
                    </button>

                    {/* Indicateur vidéo */}
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                      📹 Vidéo
                    </div>
                  </div>
                ) : (
                  // ✅ Images (code original fonctionnel)
                  <Image
                    {...generateImageProps(currentMedia.src, currentMedia.alt, mediaIndex === 0)}
                    fill
                    className="object-contain transition-all duration-300"
                    sizes={isMobile ? "100vw" : "(max-width: 1024px) 50vw, 33vw"}
                    priority={mediaIndex === 0}
                    loading={mediaIndex === 0 ? "eager" : "lazy"}
                    quality={95}
                    onLoad={() => setImageLoaded(true)}
                    onClick={() => !isMobile && setShowZoom(true)}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ✅ Contrôles de navigation (code original) */}
        {!isMobile && mediaItems.length > 1 && (
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

        {/* ✅ Compteur (code original) */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
          {mediaIndex + 1}/{mediaItems.length}
        </div>
      </div>

      {/* ✅ Miniatures avec indicateurs vidéo */}
      <div className="grid gap-4 grid-cols-4">
        {mediaItems.map((media, idx) => (
          <motion.button
            key={idx}
            onClick={() => {
              const direction = idx > mediaIndex ? 1 : -1;
              setPage([idx, direction]);
            }}
            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${
              mediaIndex === idx ? 'ring-2 ring-[#FF7E93]' : ''
            }`}
            whileHover={!isMobile ? { scale: 1.05 } : undefined}
            whileTap={{ scale: 0.95 }}
          >
            <Image
              {...generateImageProps(media.thumbnail || media.src, media.alt)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 15vw"
              quality={75}
            />
            
            {/* ✅ NOUVEAU: Indicateur de type de média */}
            {media.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="bg-white/90 rounded-full p-1">
                  <Play className="w-3 h-3 text-gray-800" />
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* ✅ Statistiques (code original) */}
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

      {/* ✅ Modal de zoom avec support vidéo */}
      <AnimatePresence>
        {showZoom && currentMedia && (
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
              {/* ✅ NOUVEAU: Support vidéo dans le zoom */}
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.src}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <Image
                  {...generateImageProps(currentMedia.src, currentMedia.alt, true)}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              )}
              
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

              {/* ✅ NOUVEAU: Navigation dans le zoom pour vidéos aussi */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      paginate(-1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full"
                    aria-label="Média précédent"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      paginate(1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full"
                    aria-label="Média suivant"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}

              {/* Compteur dans le zoom avec indicateur de type */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                {mediaIndex + 1} / {mediaItems.length}
                {currentMedia.type === 'video' && ' • Vidéo'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}