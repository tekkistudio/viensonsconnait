// src/components/admin/NotificationsProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/toast';

interface NotificationContextType {
  notifications: any[];
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const conversationsChannel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          addNotification({
            id: payload.new.id,
            type: 'new_conversation',
            data: payload.new
          });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_type === 'customer') {
            addNotification({
              id: payload.new.id,
              type: 'new_message',
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    return () => {
      conversationsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, []);

  const addNotification = (notification: any) => {
    setNotifications(prev => [notification, ...prev]);
    // Jouer un son si nécessaire
    new Audio('/sounds/notification.mp3').play().catch(() => {});
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            title={notification.type === 'new_message' ? 'Nouveau message' : 'Nouvelle conversation'}
            description={notification.data.content || 'Un client attend votre réponse'}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};