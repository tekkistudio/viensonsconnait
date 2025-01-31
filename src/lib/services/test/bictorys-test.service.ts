// src/lib/services/test/bictorys-test.service.ts
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import type { BictorysWebhookPayload, BictorysPaymentResponse } from '@/types/bictorys';

interface TestOrder {
  id: number;
  amount: number;
  currency: string;
  provider: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city?: string;
  };
}

export class BictorysTestService {
  private apiUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor() {
    this.apiUrl = process.env.BICTORYS_API_URL || 'https://api.test.bictorys.com';
    this.apiKey = process.env.BICTORYS_API_KEY || '';
    this.webhookUrl = process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/bictorys`
      : 'http://localhost:3000/api/webhooks/bictorys';
  }

  async createTestOrder(): Promise<TestOrder> {
    // Créer une commande de test
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
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
        delivery_cost: 0,
        status: 'pending',
        metadata: {
          test: true,
          source: 'test_script',
          timestamp: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: order.id,
      amount: order.total_amount || 0,
      currency: 'XOF',
      provider: 'wave_money',
      customerInfo: {
        name: `${order.first_name} ${order.last_name}`,
        phone: order.phone,
        city: order.city
      }
    };
  }

  async initiateTestPayment(order: TestOrder): Promise<BictorysPaymentResponse> {
    const reference = `TR_${Date.now()}_${order.id}`;
    const payload = {
      amount: order.amount,
      currency: order.currency,
      payment_type: order.provider,
      paymentReference: reference,
      successRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/success`,
      errorRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/error`,
      callbackUrl: this.webhookUrl,
      country: 'SN',
      customer: {
        name: order.customerInfo.name,
        phone: order.customerInfo.phone,
        email: order.customerInfo.email,
        city: order.customerInfo.city,
        country: 'SN'
      },
      metadata: {
        test: true,
        orderId: order.id,
        provider: order.provider
      }
    };

    const response = await axios.post<BictorysPaymentResponse>(
      `${this.apiUrl}/pay/v1/charges`,
      payload,
      {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Créer l'entrée de transaction
    await supabase
      .from('payment_transactions')
      .insert([{
        order_id: order.id,
        provider: order.provider.toUpperCase(),
        amount: order.amount,
        currency: order.currency,
        status: 'PENDING',
        reference,
        metadata: {
          bictorysResponse: response.data,
          customerInfo: order.customerInfo,
          initiatedAt: new Date().toISOString()
        }
      }]);

    return response.data;
  }

  async simulateWebhook(params: {
    transactionId: string;
    merchantReference: string;
    amount: number;
    status?: string;
  }): Promise<void> {
    const webhookPayload: BictorysWebhookPayload = {
      id: params.transactionId,
      merchantId: 'test_merchant',
      type: 'payment',
      amount: params.amount,
      currency: 'XOF',
      paymentReference: params.merchantReference,
      merchantReference: params.merchantReference,
      orderType: 'standard',
      orderId: params.merchantReference,
      status: params.status as any || 'succeeded',
      pspName: 'wave',
      paymentMeans: 'wave_money',
      paymentChannel: 'mobile',
      timestamp: new Date().toISOString()
    };

    await axios.post(
      this.webhookUrl,
      webhookPayload,
      {
        headers: {
          'X-Secret-Key': process.env.BICTORYS_WEBHOOK_SECRET!,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export const bictorysTestService = new BictorysTestService();