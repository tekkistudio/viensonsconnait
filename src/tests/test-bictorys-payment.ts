import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import axios, { AxiosError } from 'axios';
import type { Database } from '../types/supabase';
import { DatabaseService } from '../lib/services/database.service';
import { promises as fs } from 'fs';

// Configuration initiale
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Types
type Order = Database['public']['Tables']['orders']['Row'];

interface BictorysPaymentResponse {
  "3ds2": null | any;
  "3ds": null | any;
  transactionId: string;
  redirectUrl: string | null;
  merchantReference: string | null;
  type: string;
  link: string | null;
  qrCode: string;
  message: string | null;
  state: string | null;
}

interface BictorysWebhookPayload {
  id: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending' | 'processing' | 'reversed' | 'authorized';
  amount: number;
  currency: string;
  merchantReference: string;
  paymentMeans: string;
  pspName: string;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  redirectUrl: string | null;
  reference: string;
}

// Services
const databaseService = new DatabaseService();
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fonction pour logger dans un fichier
async function logToFile(message: string, data?: any) {
  const logMessage = `${new Date().toISOString()} - ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
  const logPath = path.join(process.cwd(), 'bictorys-test-logs.txt');
  await fs.appendFile(logPath, logMessage);
}

class BictorysTestSuite {
  private apiUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor() {
    if (!process.env.BICTORYS_API_URL || !process.env.BICTORYS_API_KEY) {
      throw new Error("Variables d'environnement Bictorys manquantes");
    }
    this.apiUrl = process.env.BICTORYS_API_URL;
    this.apiKey = process.env.BICTORYS_API_KEY;
    this.webhookUrl = process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/bictorys`
      : 'http://localhost:3000/api/webhook/bictorys';
    
    // Log pour debug
    console.log('\n🔍 Configuration webhook:');
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Webhook URL:', this.webhookUrl);
  }

  async validateEnvironment() {
    const requiredEnvVars = {
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'BICTORYS_API_URL': process.env.BICTORYS_API_URL,
      'BICTORYS_API_KEY': process.env.BICTORYS_API_KEY,
      'BICTORYS_WEBHOOK_SECRET': process.env.BICTORYS_WEBHOOK_SECRET,
      'NEXT_PUBLIC_API_URL': process.env.NEXT_PUBLIC_API_URL
    };

    console.log('\n🔍 Vérification des variables d\'environnement:');
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`${key}: ${value ? '✅ présent' : '❌ manquant'}`);
      await logToFile(`Configuration - ${key}:`, value ? 'présent' : 'manquant');
    }
    console.log('');
  }

  async runTests(): Promise<void> {
    console.log('🚀 Démarrage des tests Bictorys...\n');
    await logToFile('🚀 Démarrage des tests');

    try {
      // Validation de l'environnement
      await this.validateEnvironment();

      // Test 1: Création d'une commande de test
      console.log('📝 Test #1: Création commande...');
      const order = await this.createTestOrder();
      console.log('✅ Commande de test créée:', order);
      await logToFile('✅ Commande créée:', order);

      // Test 2: Paiement Wave Money
      console.log('\n💳 Test #2: Paiement Wave Money...');
      const wavePayment = await this.testPayment('wave_money', order);
      console.log('✅ Test paiement Wave Money:', wavePayment);
      await logToFile('✅ Paiement Wave Money:', wavePayment);

      // Créer la transaction dans Supabase
      await this.createTransaction(order.id, wavePayment);

      // Test 3: Simulation webhook avec Wave
      console.log('\n🔄 Test #3: Simulation webhook Wave...');
      await this.testWebhook({
        id: wavePayment.transactionId,
        reference: wavePayment.reference,
        orderId: order.id,
        provider: 'wave_money'
      });
      console.log('✅ Test webhook Wave réussi');
      await logToFile('✅ Webhook Wave traité');

      console.log('\n✨ Tous les tests ont réussi!');
      await logToFile('✨ Tests terminés avec succès');
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Erreur pendant les tests:', error);
      await logToFile('❌ Erreur tests:', error);
      process.exit(1);
    }
  }

  private async createTestOrder(): Promise<Order> {
    const orderData = {
      product_id: 'TEST-001',
      customer_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      city: 'Dakar',
      address: '123 Test Street',
      phone: '221776794638',
      payment_method: 'WAVE',
      order_details: 'Test Order',
      total_amount: 14000,
      metadata: {
        test: true,
        source: 'test_script',
        timestamp: new Date().toISOString()
      },
    };

    return await databaseService.createOrder(orderData);
  }

  private async createTransaction(orderId: number, paymentResult: PaymentResult) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: orderId,
        amount: 14000,
        currency: 'XOF',
        provider: 'WAVE',
        status: 'PENDING',
        reference: paymentResult.reference,
        metadata: {
          bictorysTransactionId: paymentResult.transactionId,
          redirectUrl: paymentResult.redirectUrl,
          initiatedAt: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async testPayment(provider: 'wave_money' | 'orange_money', order: Order): Promise<PaymentResult> {
    const reference = `TR_${Date.now()}_${order.id}`;
    const payload = {
      amount: order.total_amount ?? 0,
      currency: 'XOF',
      merchantReference: reference,
      metadata: {
        orderId: order.id.toString(),
        provider
      }
    };

    try {
      await logToFile('Envoi requête Bictorys:', {
        url: `${this.apiUrl}/pay/v1/charges?payment_type=${provider}`,
        payload
      });

      const response = await axios.post<BictorysPaymentResponse>(
        `${this.apiUrl}/pay/v1/charges?payment_type=${provider}`,
        payload,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      await logToFile('Réponse Bictorys:', response.data);

      const redirectUrl = response.data.link || response.data.redirectUrl || null;
      
      return {
        success: true,
        transactionId: response.data.transactionId,
        redirectUrl,
        reference
      };
    } catch (error) {
      await logToFile('Erreur paiement:', error);
      if (error instanceof AxiosError) {
        throw new Error(
          `Erreur API Bictorys: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  private async testWebhook(params: {
    id: string;
    reference: string;
    orderId: number;
    provider: 'wave_money' | 'orange_money';
  }): Promise<void> {
    const webhookPayload: BictorysWebhookPayload = {
      id: params.id,
      status: 'succeeded',
      amount: 14000,
      currency: 'XOF',
      merchantReference: params.reference,
      paymentMeans: params.provider,
      pspName: params.provider.split('_')[0]
    };

    await logToFile('Envoi webhook:', {
      url: this.webhookUrl,
      payload: webhookPayload
    });

    try {
      const response = await axios.post(
        this.webhookUrl,
        webhookPayload,
        {
          headers: {
            'X-Secret-Key': process.env.BICTORYS_WEBHOOK_SECRET!,
            'Content-Type': 'application/json'
          }
        }
      );

      await logToFile('Réponse webhook:', response.data);

      if (!response.data?.success) {
        throw new Error('Le webhook a échoué');
      }

      // Vérification de la mise à jour
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('reference', params.reference)
        .single();

      if (!transaction) {
        throw new Error(`Transaction non trouvée pour la référence ${params.reference}`);
      }

      if (transaction.status !== 'COMPLETED') {
        throw new Error(`Statut incorrect: ${transaction.status}`);
      }

      console.log('🔍 Transaction après webhook:', transaction);

    } catch (error) {
      await logToFile('Erreur webhook:', error);
      
      if (error instanceof AxiosError) {
        console.error('Erreur détaillée du webhook:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw new Error(
          `Erreur webhook: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }
}

// Exécuter les tests si le script est lancé directement
if (require.main === module) {
  const testSuite = new BictorysTestSuite();
  testSuite.runTests().catch(console.error);
}