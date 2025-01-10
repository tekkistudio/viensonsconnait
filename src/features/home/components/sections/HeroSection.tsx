// src/features/home/components/sections/HeroSection.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle
} from "../../../../components/ui/dialog";
import { useBreakpoint } from "../../../../core/theme/hooks/useBreakpoint";

interface HeroSectionProps {
  title: string;
  description: string;
  videoUrl: string;
  videoCoverImage: string;
}

export function HeroSection({
  title,
  description,
  videoUrl,
  videoCoverImage,
}: HeroSectionProps) {
  const { isMobile } = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="relative bg-brand-blue text-white overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-transparent opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-pink/40" />
        <svg
          className="absolute right-0 h-full w-1/2 transform translate-x-1/4 opacity-30"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 0C25 0 75 100 100 100V0H0Z"
            fill="currentColor"
            className="text-brand-pink"
          />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-24">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Contenu */}
          <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {title}
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-xl">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href="/nos-jeux"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-lg font-medium hover:bg-white hover:text-brand-blue transition-all transform hover:-translate-y-0.5 text-center"
              >
                Découvrir les jeux
              </Link>
              <Link
                href="https://apps.apple.com/app/vosc/id6464125284"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-brand-blue rounded-lg font-medium hover:bg-brand-pink hover:text-white transition-all transform hover:-translate-y-0.5 text-center"
              >
                Télécharger l'App pour iphone 📱
              </Link>
            </div>
          </div>

          {/* Vidéo */}
          <div className="w-full md:w-1/2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="relative w-full rounded-lg overflow-hidden group">
          <div className="relative aspect-[4/3] md:aspect-[16/9]">
            <img
              src={videoCoverImage}
              alt="Vidéo de présentation"
              className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-110">
                <Play className="w-6 h-6 md:w-8 md:h-8 text-brand-blue transform translate-x-0.5" />
              </div>
            </div>
          </div>
        </button>
      </DialogTrigger>

    <DialogContent className="w-[90vw] max-w-[1200px] h-auto aspect-video p-0 m-0 border-0 bg-transparent">
      <DialogTitle className="sr-only">Vidéo de présentation</DialogTitle>
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute -right-8 -top-8 z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          aria-label="Fermer la vidéo"
        >
          <span className="text-white text-xl">&times;</span>
        </button>
        {isOpen && (
          <iframe
            src={`${videoUrl}?autoplay=1&title=0&byline=0&portrait=0&background=0`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vidéo de présentation des jeux VIENS ON S'CONNAÎT"
            aria-label="Vidéo de présentation des jeux VIENS ON S'CONNAÎT"
          />
        )}
      </DialogContent>
    </Dialog>

            {/* Badges flottants */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-medium">+7 000 jeux vendus</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-medium">98% de satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;