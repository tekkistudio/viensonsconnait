import { supabase } from '@/lib/supabase';

interface SMSMessage {
  to: string;
  message: string;
  deliveryId?: string;
}

interface DeliveryInfo {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  delivery_notes?: string;
  tracking_number: string | null; 
}

interface DriverInfo {
  id: string;
  phone: string;
  full_name: string;
}

class SMSService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_SMS_API_URL;
  private readonly apiKey = process.env.SMS_API_KEY;

  async sendSMS({ to, message, deliveryId }: SMSMessage) {
    try {
      // Pour le développement, on simule l'envoi de SMS
      if (process.env.NODE_ENV === 'development') {
        console.log('SMS simulé:', { to, message });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true };
      }

      const response = await fetch(`${this.apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to,
          message,
          metadata: { deliveryId, type: 'delivery_notification' }
        })
      });

      if (!response.ok) {
        throw new Error('Échec de l\'envoi du SMS');
      }

      await this.logSMSSent({ to, message, deliveryId });
      return await response.json();
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  private async logSMSSent(data: SMSMessage) {
    try {
      await supabase
        .from('sms_logs')
        .insert([{
          phone_number: data.to,
          message: data.message,
          delivery_id: data.deliveryId,
          sent_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging SMS:', error);
    }
  }

  async notifyDriver(delivery: DeliveryInfo, driver: DriverInfo) {
    const message = this.formatDeliveryMessage(delivery);
    
    await this.sendSMS({
      to: driver.phone,
      message,
      deliveryId: delivery.id
    });

    await supabase
      .from('deliveries')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString()
      })
      .eq('id', delivery.id);
  }

  private formatDeliveryMessage(delivery: DeliveryInfo): string {
    const baseMessage = `
📦 Nouvelle livraison à effectuer

Client: ${delivery.customer_name}
Tél: ${delivery.customer_phone}
Adresse: ${delivery.delivery_address}
Ville: ${delivery.city}`;

    const notes = delivery.delivery_notes ? `\nNotes: ${delivery.delivery_notes}` : '';
    const tracking = delivery.tracking_number ? `\nN° Suivi: ${delivery.tracking_number}` : '';
    
    const instructions = `
Pour confirmer la livraison: "LIVRE ${delivery.id}"
Pour signaler un problème: "PROBLEME ${delivery.id}"`;

    return `${baseMessage}${notes}${tracking}${instructions}`.trim();
  }

  async sendDeliveryUpdate(delivery: DeliveryInfo, status: string) {
    const statusMessages = {
      picked_up: 'a été récupérée et est en route',
      in_transit: 'est en cours de livraison',
      delivered: 'a été livrée avec succès',
      failed: 'n\'a pas pu être livrée'
    };

    const message = `Votre livraison ${statusMessages[status as keyof typeof statusMessages] || 'a été mise à jour'}. ${delivery.tracking_number ? `N° de suivi: ${delivery.tracking_number}` : ''}`;
    
    await this.sendSMS({
      to: delivery.customer_phone,
      message,
      deliveryId: delivery.id
    });
  }
}

export const smsService = new SMSService();