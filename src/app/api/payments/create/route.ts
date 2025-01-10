// src/app/api/payments/create/route.ts
import { NextResponse } from 'next/server';
import { PaymentProvider } from '@prisma/client';
import { paymentService } from '@/lib/services/payment.service';

interface CreatePaymentBody {
  amount: number;
  currency?: string;
  orderId: string;
  paymentMethod: PaymentProvider;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city: string;
  };
  metadata?: Record<string, any>;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = (await req.json()) as CreatePaymentBody;

    // Valider les données requises
    if (!body.amount || !body.orderId || !body.paymentMethod || !body.customerInfo) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      );
    }

    const result = await paymentService.createPayment({
      amount: body.amount,
      currency: body.currency || 'XOF',
      orderId: body.orderId,
      paymentMethod: body.paymentMethod,
      customerInfo: body.customerInfo,
      metadata: body.metadata
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.paymentData
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}