// src/app/api/payments/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');
    const sessionId = searchParams.get('sessionId');

    if (!transactionId && !sessionId) {
      return NextResponse.json(
        { error: 'Transaction ID or Session ID required' },
        { status: 400 }
      );
    }

    const query = supabase
      .from('payment_transactions')
      .select(`
        id,
        status,
        amount,
        currency,
        provider,
        reference,
        created_at,
        updated_at,
        metadata,
        orders (
          id,
          status,
          total_amount,
          customer_name,
          first_name,
          last_name,
          city,
          address,
          phone,
          metadata
        )
      `);

    if (transactionId) {
      query.eq('id', transactionId);
    } else if (sessionId) {
      query.eq('reference', sessionId);
    }

    const { data: transaction, error } = await query.single();

    if (error) {
      console.error('Database query failed:', error);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.provider,
          reference: transaction.reference,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at
        },
        order: transaction.orders,
        metadata: transaction.metadata
      }
    });
  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed' 
      },
      { status: 500 }
    );
  }
}