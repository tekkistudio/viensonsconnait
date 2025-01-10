// src/features/home/components/sections/AnnouncementBar.tsx
"use client"

import { Phone, MessageSquare, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../../../../core/theme/ThemeProvider';

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
    // Met à jour la hauteur dans un attribut CSS personnalisé
    if (isVisible) {
      const announcementBar = document.getElementById('announcement-bar');
      if (announcementBar) {
        setHeight(announcementBar.offsetHeight);
        document.documentElement.style.setProperty('--announcement-height', `${announcementBar.offsetHeight}px`);
      }
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      id="announcement-bar"
      className="fixed top-0 left-0 right-0 bg-brand-pink text-white text-sm z-50"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="hidden md:block">{text}</div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <a 
              href={`tel:${phone}`} 
              className="flex items-center gap-2 hover:text-brand-pink transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden md:inline">{phone}</span>
            </a>
            <a 
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 hover:text-brand-pink transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Discuter sur WhatsApp</span>
            </a>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="ml-4 p-1 hover:text-brand-pink transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementBar;