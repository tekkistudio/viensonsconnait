// src/lib/pusher.ts
import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Configuration du serveur Pusher
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

// Configuration du client Pusher avec gestion améliorée des erreurs
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    enabledTransports: ['ws', 'wss'],
    activityTimeout: 30000,
    pongTimeout: 15000
  }
);

// Gestion des événements de connexion
pusherClient.connection.bind('error', (err: any) => {
  console.warn('Pusher connection error:', err);
});

pusherClient.connection.bind('disconnected', () => {
  console.warn('Pusher disconnected, attempting to reconnect...');
  // Tentative de reconnexion
  pusherClient.connect();
});

pusherClient.connection.bind('connected', () => {
  console.log('Successfully connected to Pusher');
});

// Vérification périodique de la connexion
setInterval(() => {
  if (pusherClient.connection.state === 'disconnected') {
    console.log('Connection check: attempting to reconnect...');
    pusherClient.connect();
  }
}, 25000); // Vérification toutes les 25 secondes