// src/features/home/components/sections/AnnouncementBar.tsx
"use client"

import { Phone, MessageSquare, X } from "lucide-react";
import { useState, useEffect } from "react";

interface AnnouncementBarProps {
  text: string;
  phone: string;
  whatsapp: string;
}

export function AnnouncementBar({ text, phone, whatsapp }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  // ✅ NOUVEAU : Vérifier si l'utilisateur avait fermé la barre dans cette session
  useEffect(() => {
    const wasClosed = sessionStorage.getItem('announcement-bar-closed');
    if (wasClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  // ✅ CORRECTION : Gestion simple de la fermeture
  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('announcement-bar-closed', 'true');
  };

  // ✅ Ne pas rendre si invisible
  if (!isVisible) return null;

  const formattedPhone = phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})(\d{2})/, "+$1 $2 $3 $4 $5");

  return (
    <div className="bg-brand-pink text-white relative z-50">
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