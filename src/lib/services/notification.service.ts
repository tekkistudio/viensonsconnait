// src/lib/services/notification.service.ts
import { Resend } from 'resend';
import { parsePhoneNumber } from 'libphonenumber-js';
import { supabase } from '@/lib/supabase';

interface NotificationOptions {
  type: 'ORDER_CREATED' | 'PAYMENT_RECEIVED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED';
  orderId: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

class NotificationService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendNotification(options: NotificationOptions) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', options.orderId)
      .single();

    if (error || !order) {
      throw new Error('Order not found');
    }

    const notifications: Promise<any>[] = [];

    // Notification email
    if (options.recipientEmail || order.metadata?.email) {
      notifications.push(this.sendEmail({
        type: options.type,
        order,
        email: options.recipientEmail || order.metadata?.email
      }));
    }

    // Notification SMS si un numéro est disponible
    if (options.recipientPhone || order.phone) {
      const phone = options.recipientPhone || order.phone;
      notifications.push(this.sendSMS({
        type: options.type,
        order,
        phone
      }));
    }

    // Notification dashboard
    notifications.push(this.createDashboardNotification({
      type: options.type,
      order
    }));

    try {
      await Promise.all(notifications);
    } catch (error) {
      console.error('Error sending notifications:', error);
      // On continue même si une notification échoue
    }
  }

  private async sendEmail({ type, order, email }: { type: NotificationOptions['type']; order: any; email: string }) {
    const templates = {
      ORDER_CREATED: {
        subject: 'Confirmation de votre commande - VIENS ON S\'CONNAÎT',
        html: `
          <h1>Merci pour votre commande!</h1>
          <p>Votre commande #${order.id} a été reçue et est en cours de traitement.</p>
          <p>Détails de la commande:</p>
          <ul>
            <li>Montant total: ${order.total_amount.toLocaleString()} FCFA</li>
            <li>Adresse de livraison: ${order.address}, ${order.city}</li>
            <li>Mode de paiement: ${order.payment_method}</li>
          </ul>
          <p>Nous vous tiendrons informé de son évolution.</p>
        `
      },
      PAYMENT_RECEIVED: {
        subject: 'Paiement reçu - VIENS ON S\'CONNAÎT',
        html: `
          <h1>Paiement confirmé</h1>
          <p>Nous avons bien reçu votre paiement pour la commande #${order.id}.</p>
          <p>Montant: ${order.total_amount.toLocaleString()} FCFA</p>
          <p>Votre commande va être préparée pour expédition.</p>
          <p>Adresse de livraison:</p>
          <p>${order.address}<br>${order.city}</p>
        `
      },
      ORDER_SHIPPED: {
        subject: 'Votre commande a été expédiée - VIENS ON S\'CONNAÎT',
        html: `
          <h1>Commande expédiée</h1>
          <p>Bonne nouvelle! Votre commande #${order.id} a été expédiée.</p>
          <p>Vous recevrez bientôt un SMS avec les détails de la livraison.</p>
        `
      },
      ORDER_DELIVERED: {
        subject: 'Commande livrée - VIENS ON S\'CONNAÎT',
        html: `
          <h1>Commande livrée</h1>
          <p>Votre commande #${order.id} a été livrée.</p>
          <p>Nous espérons que vous apprécierez votre achat!</p>
          <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
        `
      }
    };

    const template = templates[type];
    if (!template) {
      throw new Error('Email template not found');
    }

    return this.resend.emails.send({
      from: 'VIENS ON S\'CONNAÎT <commandes@viensonconnait.com>',
      to: [email], 
      subject: template.subject,
      html: template.html,
      replyTo: 'support@viensonconnait.com'
    });
  }

  private async sendSMS({ type, order, phone }: { type: NotificationOptions['type']; order: any; phone: string }) {
    // Formatter le numéro de téléphone
    const parsedPhone = parsePhoneNumber(phone, 'SN');
    if (!parsedPhone?.isValid()) {
      throw new Error('Invalid phone number');
    }

    const templates = {
      ORDER_CREATED: `VIENS ON S'CONNAÎT - Commande #${order.id} reçue. Total: ${order.total_amount.toLocaleString()} FCFA. Merci!`,
      PAYMENT_RECEIVED: `VIENS ON S'CONNAÎT - Paiement reçu pour commande #${order.id}. Préparation en cours.`,
      ORDER_SHIPPED: `VIENS ON S'CONNAÎT - Commande #${order.id} expédiée. Livraison en cours.`,
      ORDER_DELIVERED: `VIENS ON S'CONNAÎT - Commande #${order.id} livrée. Merci de votre confiance!`
    };

    const message = templates[type];
    if (!message) {
      throw new Error('SMS template not found');
    }

    // TODO: Implémentation future du service SMS
    console.log(`SMS à envoyer à ${parsedPhone.formatInternational()}: ${message}`);
  }

  private async createDashboardNotification({ type, order }: { type: NotificationOptions['type']; order: any }) {
    const templates = {
      ORDER_CREATED: { title: 'Nouvelle commande', priority: 'high' },
      PAYMENT_RECEIVED: { title: 'Paiement reçu', priority: 'medium' },
      ORDER_SHIPPED: { title: 'Commande expédiée', priority: 'medium' },
      ORDER_DELIVERED: { title: 'Commande livrée', priority: 'low' }
    };

    const template = templates[type];
    if (!template) {
      throw new Error('Notification template not found');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: template.title,
        content: `Commande #${order.id}`,
        type,
        priority: template.priority,
        order_id: order.id,
        metadata: {
          orderAmount: order.total_amount,
          customerName: `${order.first_name} ${order.last_name}`,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const notificationService = new NotificationService();