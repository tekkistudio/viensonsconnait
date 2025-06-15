// src/features/home/components/mobile/MobileAnnouncementBar.tsx
"use client"

import { Phone, MessageSquare, X } from "lucide-react";
import { useState, useEffect } from "react";

interface MobileAnnouncementBarProps {
  text: string;
  phone: string;
  whatsapp: string;
}

export function MobileAnnouncementBar({ text, phone, whatsapp }: MobileAnnouncementBarProps) {
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

  if (!isVisible) return null;

  const formattedPhone = phone.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, "+$1 $2 $3 $4 $5");

  return (
    <div className="bg-gradient-to-r from-brand-pink to-red-500 text-white relative z-50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Texte condensé pour mobile */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              🌟 Téléchargez notre App Mobile 📲
            </span>
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
            >
              <MessageSquare className="w-4 h-4" />
            </a>

            {/* Bouton fermer */}
            <button
              onClick={handleClose}
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