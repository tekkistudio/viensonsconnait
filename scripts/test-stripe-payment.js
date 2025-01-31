// scripts/test-stripe-payment.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialisation des clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

class StripePaymentTester {
  async validateEnvironment() {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_APP_URL'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }
    
    console.log('Environment validation successful');
  }

  async createTestOrder() {
    const orderData = {
      product_id: '1001',
      status: 'PENDING',
      total_amount: 14000,
      customer_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      city: 'Dakar',
      address: '123 Test Street',
      phone: '221776794638',
      payment_method: 'CARD',
      order_details: 'Test Order',
      metadata: {
        test: true,
        source: 'test_script',
        created_at: new Date().toISOString()
      }
    };

    console.log('\nCreating test order...');
    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    
    console.log('Order created successfully:', order);
    return order;
  }

  async initiateStripePayment(order) {
    console.log('\nInitiating Stripe payment session...');
    
    // Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Commande #${order.id}`,
            description: order.order_details,
          },
          unit_amount: Math.round(order.total_amount * 0.0015 * 100), // Convertir FCFA en EUR
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`,
      metadata: {
        orderId: String(order.id),
        test: 'true'
      },
    });

    // Créer une transaction dans la base de données
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: order.id,
        provider: 'STRIPE',
        amount: order.total_amount,
        currency: 'XOF',
        status: 'PENDING',
        reference: session.id,
        metadata: {
          stripeSessionId: session.id,
          test: true,
          createdAt: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('Stripe session created:', {
      sessionId: session.id,
      paymentUrl: session.url,
      transactionId: transaction.id
    });

    return {
      success: true,
      sessionId: session.id,
      paymentUrl: session.url,
      transactionId: transaction.id
    };
  }

  async runTest() {
    try {
      await this.validateEnvironment();
      const order = await this.createTestOrder();
      const paymentResult = await this.initiateStripePayment(order);

      console.log('\nTest completed successfully!');
      console.log('Payment URL:', paymentResult.paymentUrl);
      console.log('Session ID:', paymentResult.sessionId);
      console.log('\nVous pouvez tester le paiement avec une carte de test :');
      console.log('- Numéro: 4242 4242 4242 4242');
      console.log('- Date d\'expiration: une date future quelconque');
      console.log('- CVC: 3 chiffres quelconques');
      
      return { success: true, order, paymentResult };
    } catch (error) {
      console.error('\nTest failed:', error.message);
      if (error.cause) {
        console.error('Cause:', error.cause);
      }
      return { success: false, error };
    }
  }
}

// Exécuter le test
const tester = new StripePaymentTester();
tester.runTest().then(result => {
  process.exit(result.success ? 0 : 1);
});