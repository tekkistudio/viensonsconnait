// src/core/hooks/useAnnouncementBar.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseAnnouncementBarReturn {
  isVisible: boolean
  height: number
  setVisible: (visible: boolean) => void
  updateHeight: (newHeight: number) => void
}

export function useAnnouncementBar(initialVisible: boolean = true): UseAnnouncementBarReturn {
  const [isVisible, setIsVisible] = useState(initialVisible)
  const [height, setHeight] = useState(0)

  // ✅ Fonction pour mettre à jour la visibilité
  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible)
    
    // Sauvegarder l'état dans localStorage
    try {
      localStorage.setItem('announcement-bar-visible', visible.toString())
    } catch (error) {
      console.warn('Cannot save announcement bar visibility:', error)
    }
  }, [])

  // ✅ Fonction pour mettre à jour la hauteur
  const updateHeight = useCallback((newHeight: number) => {
    setHeight(newHeight)
    
    // Mettre à jour les variables CSS
    const heightValue = isVisible ? `${newHeight}px` : '0px'
    document.documentElement.style.setProperty('--announcement-height', heightValue)
    
    // Mettre à jour le padding du body
    document.body.style.paddingTop = heightValue
    
    console.log('📏 AnnouncementBar height updated:', heightValue)
  }, [isVisible])

  // ✅ Charger l'état depuis localStorage au démarrage
  useEffect(() => {
    try {
      const savedVisibility = localStorage.getItem('announcement-bar-visible')
      if (savedVisibility !== null) {
        setIsVisible(savedVisibility === 'true')
      }
    } catch (error) {
      console.warn('Cannot read announcement bar visibility:', error)
    }
  }, [])

  // ✅ Mettre à jour les variables CSS quand la visibilité change
  useEffect(() => {
    const heightValue = isVisible ? `${height}px` : '0px'
    document.documentElement.style.setProperty('--announcement-height', heightValue)
    document.body.style.paddingTop = heightValue
  }, [isVisible, height])

  // ✅ Cleanup au démontage
  useEffect(() => {
    return () => {
      // Reset des variables CSS si le composant est démonté
      document.documentElement.style.setProperty('--announcement-height', '0px')
      document.body.style.paddingTop = '0px'
    }
  }, [])

  return {
    isVisible,
    height,
    setVisible,
    updateHeight
  }
}