// src/app/api/payments/[...routes]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paymentService } from '@/lib/services/payment.service';

// GET /api/payments/status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transaction = await paymentService.getTransactionStatus(transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/payments/create
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await req.json();

    // Validation des données requises
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