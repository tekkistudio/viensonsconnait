// scripts/test-payment-flow.ts
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface BictorysPaymentResponse {
  id: string;
  paymentUrl: string;
  status: string;
  merchantReference: string;
  amount: number;
  currency: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testPaymentFlow() {
  console.log('🚀 Démarrage du test de paiement...\n');

  try {
    // 1. Créer une commande test
    console.log('📦 Création de la commande test...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        product_id: 'TEST-001',
        status: 'PENDING',
        total_amount: 5000,
        customer_name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        city: 'Dakar',
        address: '123 Test Street',
        phone: '221776794638',
        payment_method: 'WAVE',
        order_details: 'Test Order',
        metadata: {
          test: true,
          email: 'test@example.com'
        }
      }])
      .select()
      .single();

    if (orderError) throw orderError;
    console.log('✅ Commande créée:', order.id);

    // 2. Créer une transaction
    console.log('\n💳 Création de la transaction...');
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: order.id,
        amount: order.total_amount,
        currency: 'XOF',
        provider: 'WAVE',
        status: 'PENDING',
        reference: `tr_${Date.now()}`,
        metadata: {
          test: true
        }
      }])
      .select()
      .single();

    if (transactionError) throw transactionError;
    console.log('✅ Transaction créée:', transaction.id);

    // 3. Initier le paiement Bictorys
    console.log('\n🌐 Initiation du paiement Bictorys...');
    try {
      const paymentUrl = `${process.env.BICTORYS_API_URL}/pay/v1/charges?payment_type=mobilemoney`;
      console.log('URL de requête:', paymentUrl);
      
      const paymentPayload = {
        amount: transaction.amount,
        currency: transaction.currency,
        provider: "wave",
        country: "SN",
        phoneNumber: order.phone.replace(/[^\d]/g, ''),
        customerObject: {
          name: `${order.first_name} ${order.last_name}`,
          phone: order.phone.replace(/[^\d]/g, ''),
          email: order.metadata.email,
          city: order.city,
          country: "SN",
          locale: "fr-FR"
        },
        paymentReference: transaction.reference,
        merchantReference: transaction.id,
        successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?ref=${transaction.id}`,
        errorRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?ref=${transaction.id}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/bictorys`,
        metadata: {
          orderId: order.id,
          test: true
        }
      };

      console.log('Payload:', JSON.stringify(paymentPayload, null, 2));

      const { data: paymentData } = await axios.post<BictorysPaymentResponse>(
        paymentUrl,
        paymentPayload,
        {
          headers: {
            'X-Api-Key': process.env.BICTORYS_API_KEY!,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('✅ Paiement initié:', {
        transactionId: paymentData.id,
        paymentUrl: paymentData.paymentUrl
      });

      // 4. Mettre à jour la transaction avec la référence Bictorys
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          reference: paymentData.id,
          metadata: {
            ...transaction.metadata,
            bictorysResponse: paymentData
          }
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      console.log('\n✨ Test complété avec succès!');
      console.log('📱 URL de paiement:', paymentData.paymentUrl);
      console.log('🔑 ID de transaction:', transaction.id);
      return { success: true, paymentUrl: paymentData.paymentUrl, transactionId: transaction.id };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Erreur Bictorys:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.config?.headers
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    return { success: false, error };
  }
}

// Exécuter le test
testPaymentFlow().then(result => {
  if (!result.success) {
    process.exit(1);
  }
  console.log('\n🏁 Test terminé');
  process.exit(0);
});