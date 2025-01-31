// src/hooks/useNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type NotificationType = 'order' | 'conversation' | 'payment' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  variant: 'default' | 'success' | 'error' | 'warning';
  seen: boolean;
  created_at: string;
}

// Définir les sons pour différents événements
const NOTIFICATION_SOUNDS = {
  order: '/sounds/new-sale.mp3', // Son de caisse pour nouvelle vente
  message: '/sounds/message.mp3', // Son discret pour nouveau message
  payment: '/sounds/payment-success.mp3', // Son de succès pour paiement
  error: '/sounds/payment-error.mp3' // Son d'erreur
};

export function useNotifications(onCustomNotification?: (data: any) => void) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true); // Pour permettre à l'utilisateur de couper le son

  // Fonction pour jouer les sons
  const playNotificationSound = useCallback((soundType: keyof typeof NOTIFICATION_SOUNDS) => {
    if (!soundEnabled) return;

    // Créer une nouvelle instance audio à chaque fois pour permettre des sons simultanés
    const audio = new Audio(NOTIFICATION_SOUNDS[soundType]);
    // Réduire le volume pour que ce ne soit pas trop agressif
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Gérer silencieusement les erreurs de lecture (certains navigateurs bloquent l'autoplay)
      console.log('Son bloqué par le navigateur');
    });
  }, [soundEnabled]);

  const handleNewOrder = useCallback((payload: any) => {
    const newNotification: Notification = {
      id: payload.new.id,
      type: 'order',
      title: '💰 Nouvelle vente !',
      description: `${payload.new.total_amount.toLocaleString()} FCFA - ${payload.new.customer_name}`,
      variant: 'success',
      seen: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    playNotificationSound('order');

    // Déclencher la notification du navigateur
    if (Notification.permission === 'granted') {
      new Notification('Nouvelle vente !', {
        body: `${payload.new.total_amount.toLocaleString()} FCFA - ${payload.new.customer_name}`,
        icon: '/icons/sale-icon.png'
      });
    }
  }, [playNotificationSound]);

  const handleNewMessage = useCallback((payload: any) => {
    const newNotification: Notification = {
      id: payload.new.id,
      type: 'conversation',
      title: '💬 Nouveau message',
      description: 'Un client attend votre réponse',
      variant: 'default',
      seen: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    playNotificationSound('message');
  }, [playNotificationSound]);

  const handlePayment = useCallback((payload: any) => {
    const success = payload.new.status === 'succeeded';
    const newNotification: Notification = {
      id: payload.new.id,
      type: 'payment',
      title: success ? '✅ Paiement réussi' : '❌ Échec de paiement',
      description: `${payload.new.amount.toLocaleString()} FCFA`,
      variant: success ? 'success' : 'error',
      seen: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    playNotificationSound(success ? 'payment' : 'error');
  }, [playNotificationSound]);

  useEffect(() => {
    // Demander la permission pour les notifications du navigateur
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // S'abonner aux changements dans la base de données
    const ordersSubscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handleNewOrder)
      .subscribe();

    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'sender_type=eq.customer' }, 
        handleNewMessage
      )
      .subscribe();

    const paymentsSubscription = supabase
      .channel('payment_transactions')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'payment_transactions' }, 
        handlePayment
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
      paymentsSubscription.unsubscribe();
    };
  }, [handleNewOrder, handleNewMessage, handlePayment]);

  const markAsSeen = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, seen: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return {
    notifications,
    unreadCount,
    markAsSeen,
    soundEnabled,
    setSoundEnabled,
  };
}