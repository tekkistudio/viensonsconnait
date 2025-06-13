// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Créer un MediaQueryList pour le query donné
  const getMatches = (query: string): boolean => {
    // Vérifier si window est disponible (pour éviter les erreurs SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Définir le state initial
    setMatches(mediaQuery.matches);

    // Créer un gestionnaire d'événement pour les changements
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Ajouter l'écouteur d'événements
    if (mediaQuery.addListener) {
      // Version plus ancienne
      mediaQuery.addListener(handler);
    } else {
      // Version moderne
      mediaQuery.addEventListener('change', handler);
    }

    // Nettoyer
    return () => {
      if (mediaQuery.removeListener) {
        // Version plus ancienne
        mediaQuery.removeListener(handler);
      } else {
        // Version moderne
        mediaQuery.removeEventListener('change', handler);
      }
    };
  }, [query]);

  return matches;
}

