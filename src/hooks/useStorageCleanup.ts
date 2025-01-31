// src/hooks/useStorageCleanup.ts

import { useEffect } from 'react';

/**
 * Hook pour gérer le nettoyage automatique du localStorage
 * afin d'éviter l'erreur QUOTA_BYTES
 */
export const useStorageCleanup = (prefix: string = 'sb-', maxItems: number = 20) => {
  useEffect(() => {
    const cleanup = () => {
      try {
        // Récupérer toutes les clés du localStorage
        const keys = Object.keys(localStorage);
        
        // Filtrer les clés qui commencent par le préfixe spécifié
        const prefixedKeys = keys.filter(key => key.startsWith(prefix));

        // Si on dépasse le nombre maximum d'items
        if (prefixedKeys.length > maxItems) {
          // Trier les clés par date de dernière modification
          const sortedKeys = prefixedKeys.sort((a, b) => {
            const aTime = localStorage.getItem(a + '_time');
            const bTime = localStorage.getItem(b + '_time');
            return (Number(bTime) || 0) - (Number(aTime) || 0);
          });

          // Supprimer les items les plus anciens
          sortedKeys.slice(maxItems).forEach(key => {
            localStorage.removeItem(key);
            localStorage.removeItem(key + '_time');
          });
        }

        // Mettre à jour le timestamp pour les clés restantes
        prefixedKeys.forEach(key => {
          localStorage.setItem(key + '_time', Date.now().toString());
        });

      } catch (error) {
        console.warn('Storage cleanup failed:', error);
      }
    };

    // Exécuter le nettoyage immédiatement
    cleanup();

    // Configurer un intervalle pour le nettoyage périodique
    const interval = setInterval(cleanup, 5 * 60 * 1000); // Toutes les 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [prefix, maxItems]);
};