// src/components/ui/SocialProofNotification.tsx - SOCIAL PROOF DYNAMIQUE

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, MapPin, Clock } from 'lucide-react';

interface PurchaseNotification {
  id: string;
  customerName: string;
  productName: string;
  city: string;
  timeAgo: string;
  amount?: number;
}

interface SocialProofNotificationProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const SocialProofNotification: React.FC<SocialProofNotificationProps> = ({
  isVisible = true,
  position = 'bottom-left',
  className = ''
}) => {
  const [currentNotification, setCurrentNotification] = useState<PurchaseNotification | null>(null);
  const [notificationIndex, setNotificationIndex] = useState(0);

  // ✅ DONNÉES DE NOTIFICATIONS RÉALISTES POUR LE SÉNÉGAL
  const notifications: PurchaseNotification[] = [
    {
      id: '1',
      customerName: 'Aminata',
      productName: 'le jeu Pour les Couples',
      city: 'Dakar',
      timeAgo: 'il y a 3 minutes',
      amount: 14000
    },
    {
      id: '2',
      customerName: 'Moussa',
      productName: 'le jeu Pour les Amis',
      city: 'Thiès',
      timeAgo: 'il y a 8 minutes'
    },
    {
      id: '3',
      customerName: 'Fatou',
      productName: 'le jeu Pour les Familles',
      city: 'Saint-Louis',
      timeAgo: 'il y a 12 minutes'
    },
    {
      id: '4',
      customerName: 'Ibrahima',
      productName: 'le jeu Pour les Couples',
      city: 'Kaolack',
      timeAgo: 'il y a 15 minutes'
    },
    {
      id: '5',
      customerName: 'Aïssa',
      productName: 'le jeu Pour les Mariés',
      city: 'Ziguinchor',
      timeAgo: 'il y a 18 minutes'
    },
    {
      id: '6',
      customerName: 'Ousmane',
      productName: 'le jeu Pour les Amis',
      city: 'Diourbel',
      timeAgo: 'il y a 22 minutes'
    },
    {
      id: '7',
      customerName: 'Mariama',
      productName: 'le jeu Pour les Familles',
      city: 'Louga',
      timeAgo: 'il y a 25 minutes'
    },
    {
      id: '8',
      customerName: 'Cheikh',
      productName: 'le jeu Pour les Couples',
      city: 'Mbour',
      timeAgo: 'il y a 28 minutes'
    }
  ];

  // ✅ GESTION DU CYCLE DES NOTIFICATIONS
  useEffect(() => {
    if (!isVisible || notifications.length === 0) return;

    const showNotification = () => {
      setCurrentNotification(notifications[notificationIndex]);
      
      // Passer à la notification suivante
      setNotificationIndex((prev) => (prev + 1) % notifications.length);
    };

    const hideNotification = () => {
      setCurrentNotification(null);
    };

    // ✅ TIMING RÉALISTE: Afficher pendant 4 secondes, cacher pendant 6-12 secondes
    const showTimer = setTimeout(showNotification, 1000); // Premier affichage après 1s
    
    const cycleTimer = setInterval(() => {
      showNotification();
      
      // Cacher après 4 secondes
      setTimeout(hideNotification, 4000);
    }, 10000 + Math.random() * 8000); // Intervalle entre 10-18 secondes

    // Cacher la première notification après 4 secondes
    const hideTimer = setTimeout(hideNotification, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(cycleTimer);
    };
  }, [isVisible, notificationIndex, notifications]);

  // ✅ CALCUL DE LA POSITION
  const getPositionClasses = () => {
    const baseClasses = "fixed z-50";
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} bottom-4 left-4`;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <AnimatePresence mode="wait">
        {currentNotification && (
          <motion.div
            key={currentNotification.id}
            initial={{ 
              opacity: 0, 
              scale: 0.8,
              x: position.includes('right') ? 50 : -50,
              y: position.includes('top') ? -20 : 20
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: 0,
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              x: position.includes('right') ? 50 : -50,
              y: position.includes('top') ? -20 : 20
            }}
            transition={{ 
              duration: 0.5,
              ease: "easeOut"
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
          >
            {/* ✅ HEADER AVEC ICÔNE */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-sm font-medium text-gray-900">
                Commande confirmée ✅
              </div>
            </div>

            {/* ✅ CONTENU PRINCIPAL */}
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-[#FF7E93]">
                  {currentNotification.customerName}
                </span>
                {' '}vient d'acheter{' '}
                <span className="font-medium">
                  {currentNotification.productName}
                </span>
              </p>

              {/* ✅ MÉTADONNÉES */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{currentNotification.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{currentNotification.timeAgo}</span>
                </div>
              </div>

              {/* ✅ MONTANT SI DISPONIBLE */}
              {currentNotification.amount && (
                <div className="text-xs text-green-600 font-medium">
                  {currentNotification.amount.toLocaleString()} FCFA
                </div>
              )}
            </div>

            {/* ✅ BARRE DE PROGRESSION SUBTILE */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-[#FF7E93] rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialProofNotification;