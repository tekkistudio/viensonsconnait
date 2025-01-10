// src/lib/services/notification.service.ts
import { Resend } from 'resend';
import { prisma } from '../prisma';
import { parsePhoneNumber } from 'libphonenumber-js';

interface NotificationOptions {
  type: 'ORDER_CREATED' | 'PAYMENT_RECEIVED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED';
  orderId: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

class NotificationService {
  private resend: Resend;
  private twilioClient: any; // À implémenter plus tard pour les SMS

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendNotification(options: NotificationOptions) {
    const order = await prisma.order.findUnique({
      where: { id: options.orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const customerInfo = order.customerInfo as any;
    const notifications: Promise<any>[] = [];

    // Notification email
    if (options.recipientEmail || customerInfo.email) {
      notifications.push(this.sendEmail({
        type: options.type,
        order,
        email: options.recipientEmail || customerInfo.email
      }));
    }

    // Notification SMS
    if (options.recipientPhone || customerInfo.phone) {
      const phone = options.recipientPhone || customerInfo.phone;
      notifications.push(this.sendSMS({
        type: options.type,
        order,
        phone
      }));
    }

    // Notification dashboard (stockée en base de données)
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
        subject: 'Confirmation de votre commande',
        html: `
          <h1>Merci pour votre commande!</h1>
          <p>Votre commande #${order.id} a été reçue et est en cours de traitement.</p>
          <p>Total: ${order.totalAmount} FCFA</p>
          <p>Nous vous tiendrons informé de son évolution.</p>
        `
      },
      PAYMENT_RECEIVED: {
        subject: 'Paiement reçu pour votre commande',
        html: `
          <h1>Paiement confirmé</h1>
          <p>Nous avons bien reçu votre paiement pour la commande #${order.id}.</p>
          <p>Votre commande va être préparée pour expédition.</p>
        `
      }
      // Ajoutez d'autres templates selon les besoins
    };

    const template = templates[type];
    if (!template) {
      throw new Error('Email template not found');
    }

    return this.resend.emails.send({
      from: 'VIENS ON S\'CONNAÎT <commandes@viensonconnait.com>',
      to: email,
      subject: template.subject,
      html: template.html
    });
  }

  private async sendSMS({ type, order, phone }: { type: NotificationOptions['type']; order: any; phone: string }) {
    // Formatter le numéro de téléphone
    const parsedPhone = parsePhoneNumber(phone, 'SN');
    if (!parsedPhone?.isValid()) {
      throw new Error('Invalid phone number');
    }

    const templates = {
      ORDER_CREATED: `Commande #${order.id} reçue. Total: ${order.totalAmount} FCFA. Merci de votre confiance!`,
      PAYMENT_RECEIVED: `Paiement reçu pour commande #${order.id}. Préparation en cours.`,
      // Ajoutez d'autres templates selon les besoins
    };

    const message = templates[type];
    if (!message) {
      throw new Error('SMS template not found');
    }

    // TODO: Implémenter l'envoi de SMS via un service comme Twilio ou MessageBird
    console.log(`SMS would be sent to ${parsedPhone.formatInternational()}: ${message}`);
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

    return prisma.notification.create({
      data: {
        title: template.title,
        content: `Commande #${order.id}`,
        type,
        priority: template.priority,
        orderId: order.id,
        metadata: {
          orderAmount: order.totalAmount,
          customerName: (order.customerInfo as any).firstName + ' ' + (order.customerInfo as any).lastName
        }
      }
    });
  }
}

export const notificationService = new NotificationService();