// src/features/home/components/sections/AnnouncementBar.tsx
"use client"

import { Phone, MessageSquare, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/core/theme/ThemeProvider";

interface AnnouncementBarProps {
  text: string;
  phone: string;
  whatsapp: string;
}

export function AnnouncementBar({ text, phone, whatsapp }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (isVisible) {
      const announcementBar = document.getElementById("announcement-bar");
      if (announcementBar) {
        setHeight(announcementBar.offsetHeight);
        document.documentElement.style.setProperty(
          "--announcement-height",
          `${announcementBar.offsetHeight}px`
        );
      }
    } else {
      document.documentElement.style.setProperty("--announcement-height", "0px");
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const formattedPhone = phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})(\d{2})/, "+$1 $2 $3 $4 $5");

  return (
    <div
      id="announcement-bar"
      className="fixed top-0 left-0 right-0 bg-brand-pink text-white z-50 transition-all duration-300"
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
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline text-sm">
                Discuter sur WhatsApp
              </span>
            </a>

            {/* Bouton fermer */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:text-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 rounded"
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