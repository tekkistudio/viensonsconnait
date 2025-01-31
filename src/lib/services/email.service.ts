// src/lib/services/email.service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDetails: string;
  totalAmount: string;
  shippingAddress: string;
  paymentMethod: string;
}

class EmailService {
  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const data = await resend.emails.send({
        from: 'VIENS ON S\'CONNAÎT <commandes@viensonconnait.com>',
        to,
        subject,
        html,
      });
      return { success: true, data };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error };
    }
  }

  async sendOrderConfirmation(data: OrderEmailData) {
    const html = `
      <h1>Merci pour votre commande !</h1>
      <p>Cher(e) ${data.customerName},</p>
      <p>Nous avons bien reçu votre commande n°${data.orderId}.</p>
      
      <h2>Détails de votre commande :</h2>
      <p>${data.orderDetails}</p>
      
      <p><strong>Montant total :</strong> ${data.totalAmount}</p>
      <p><strong>Mode de paiement :</strong> ${data.paymentMethod}</p>
      
      <h2>Adresse de livraison :</h2>
      <p>${data.shippingAddress}</p>
      
      <p>Votre commande sera livrée dans les meilleurs délais.</p>
      
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L'équipe VIENS ON S'CONNAÎT</p>
    `;

    return this.sendEmail(
      data.customerEmail,
      'Confirmation de votre commande - VIENS ON S\'CONNAÎT',
      html
    );
  }

  async sendOrderNotificationToAdmin(data: OrderEmailData) {
    const html = `
      <h1>Nouvelle commande reçue !</h1>
      <h2>Détails de la commande :</h2>
      <ul>
        <li>N° de commande : ${data.orderId}</li>
        <li>Client : ${data.customerName}</li>
        <li>Email : ${data.customerEmail}</li>
        <li>Montant : ${data.totalAmount}</li>
        <li>Paiement : ${data.paymentMethod}</li>
      </ul>
      
      <h2>Produits commandés :</h2>
      <p>${data.orderDetails}</p>
      
      <h2>Adresse de livraison :</h2>
      <p>${data.shippingAddress}</p>
    `;

    return this.sendEmail(
      process.env.ADMIN_EMAIL!, // Votre email d'administrateur
      `Nouvelle commande #${data.orderId}`,
      html
    );
  }

  async sendPaymentFailureNotification(data: {
    customerEmail: string;
    customerName: string;
    orderId: string;
    error?: string;
  }) {
    const html = `
      <h1>Problème avec votre paiement</h1>
      <p>Cher(e) ${data.customerName},</p>
      <p>Nous avons rencontré un problème lors du traitement du paiement pour votre commande n°${data.orderId}.</p>
      <p>Aucun montant n'a été débité de votre compte.</p>
      <p>Vous pouvez réessayer le paiement en retournant sur notre site.</p>
      <p>Si vous continuez à rencontrer des difficultés, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe VIENS ON S'CONNAÎT</p>
    `;

    return this.sendEmail(
      data.customerEmail,
      'Échec du paiement - VIENS ON S\'CONNAÎT',
      html
    );
  }
}

export const emailService = new EmailService();