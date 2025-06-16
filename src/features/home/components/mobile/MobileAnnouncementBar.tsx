// src/features/home/components/mobile/MobileAnnouncementBar.tsx - VERSION AVEC LIEN
"use client"

import { Phone, MessageSquare, X, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface MobileAnnouncementBarProps {
  text: string;
  phone: string;
  whatsapp: string;
  // ✅ NOUVEAU: Props pour le lien
  href?: string;
  linkText?: string;
}

export function MobileAnnouncementBar({ 
  text, 
  phone, 
  whatsapp,
  href = "https://apps.apple.com/app/viensonsconnait/id6464125284",
  linkText = "🌟 Téléchargez notre App Mobile 📲"
}: MobileAnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const wasClosed = sessionStorage.getItem('mobile-announcement-bar-closed');
    if (wasClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('mobile-announcement-bar-closed', 'true');
    
    // Déclencher un événement personnalisé pour notifier le changement
    window.dispatchEvent(new CustomEvent('announcementBarClosed'));
  };

  // ✅ NOUVEAU: Gestion du clic sur la barre
  const handleBarClick = () => {
    if (href) {
      // Ouvrir le lien dans un nouvel onglet
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isVisible) return null;

  const formattedPhone = phone.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, "+$1 $2 $3 $4 $5");

  return (
    <div className="bg-gradient-to-r from-brand-pink to-red-500 text-white relative z-50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* ✅ AMÉLIORATION: Zone cliquable pour le lien */}
          <div 
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleBarClick}
          >
            <span className="text-sm font-medium truncate">
              {linkText}
            </span>
            {href && (
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-80" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="WhatsApp"
              onClick={(e) => e.stopPropagation()} // Empêcher la propagation vers le clic de la barre
            >
              <MessageSquare className="w-4 h-4" />
            </a>

            {/* Bouton fermer */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Empêcher la propagation vers le clic de la barre
                handleClose();
              }}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}