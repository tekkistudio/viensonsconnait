// src/features/home/components/sections/AnnouncementBar.tsx
"use client"

import { Phone, MessageSquare, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface AnnouncementBarProps {
  text: string;
  phone: string;
  whatsapp: string;
}

export function AnnouncementBar({ text, phone, whatsapp }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // ✅ CORRECTION : Gestion robuste de la hauteur avec ResizeObserver
  useEffect(() => {
    const updateHeight = () => {
      if (barRef.current && isVisible) {
        const newHeight = barRef.current.offsetHeight;
        setHeight(newHeight);
        
        // ✅ CORRECTION : Mise à jour immédiate des variables CSS
        document.documentElement.style.setProperty(
          "--announcement-height", 
          `${newHeight}px`
        );
        
        // ✅ NOUVEAU : Mise à jour du padding du body
        document.body.style.paddingTop = `${newHeight}px`;
        
        console.log('📏 AnnouncementBar height updated:', newHeight);
      } else {
        // ✅ CORRECTION : Reset complet quand invisible
        document.documentElement.style.setProperty("--announcement-height", "0px");
        document.body.style.paddingTop = "0px";
        console.log('📏 AnnouncementBar height reset to 0');
      }
    };

    // Mise à jour initiale
    updateHeight();

    // ✅ NOUVEAU : Observer les changements de taille
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    if (barRef.current) {
      resizeObserver.observe(barRef.current);
    }

    // ✅ NOUVEAU : Écouter les changements d'orientation
    const handleOrientationChange = () => {
      setTimeout(updateHeight, 100); // Délai pour que le navigateur s'adapte
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', updateHeight);
    };
  }, [isVisible]);

  // ✅ CORRECTION : Gestion de la fermeture avec localStorage
  const handleClose = () => {
    setIsVisible(false);
    
    // ✅ NOUVEAU : Mémoriser la fermeture pour cette session
    try {
      localStorage.setItem('announcement-bar-closed', 'true');
    } catch (error) {
      console.warn('Cannot save announcement bar state:', error);
    }
  };

  // ✅ NOUVEAU : Vérifier si l'utilisateur avait fermé la barre
  useEffect(() => {
    try {
      const wasClosed = localStorage.getItem('announcement-bar-closed');
      if (wasClosed === 'true') {
        setIsVisible(false);
      }
    } catch (error) {
      console.warn('Cannot read announcement bar state:', error);
    }
  }, []);

  // ✅ CORRECTION : Ne pas rendre si invisible
  if (!isVisible) return null;

  const formattedPhone = phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})(\d{2})/, "+$1 $2 $3 $4 $5");

  return (
    <div
      ref={barRef}
      id="announcement-bar"
      className="fixed top-0 left-0 right-0 bg-brand-pink text-white z-50 transition-all duration-300 shadow-sm"
      style={{
        // ✅ NOUVEAU : Assurer la visibilité au-dessus de tout
        zIndex: 9999
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Texte principal - visible uniquement sur desktop */}
          <div className="hidden md:block text-sm font-medium">
            {text}
          </div>

          {/* Texte condensé - visible uniquement sur mobile */}
          <div className="md:hidden text-sm font-medium truncate max-w-[200px]">
            Dakar 🇸🇳 | Abidjan 🇨🇮 
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Téléphone */}
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 hover:text-white/90 transition-colors"
              aria-label={`Appeler au ${formattedPhone}`}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden md:inline text-sm">{formattedPhone}</span>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white/90 transition-colors whitespace-nowrap"
              aria-label="Discuter sur WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline text-sm">
                Discuter sur WhatsApp
              </span>
            </a>

            {/* Bouton fermer */}
            <button
              onClick={handleClose}
              className="p-1 hover:text-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 rounded"
              aria-label="Fermer la barre d'annonce"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}