// src/app/api/payments/callback/[status]/route.ts
import { NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { paymentService } from '@/lib/services/payment.service';

export async function GET(
  request: Request,
  { params }: { params: { status: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('ref');
    
    if (!reference) {
      return NextResponse.redirect(new URL('/payment/error', request.url));
    }

    const transaction = await paymentService.getTransactionStatus(reference);
    
    if (!transaction) {
      console.error('No transaction found for reference:', reference);
      return NextResponse.redirect(new URL('/payment/error', request.url));
    }

    // Mise à jour du statut selon le callback
    await prisma.paymentTransaction.update({
      where: { id: reference },
      data: {
        status: params.status === 'success' ? 'COMPLETED' : 'FAILED',
        metadata: {
          ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
          callbackReceived: new Date().toISOString()
        }
      }
    });

    // Construction de l'URL de redirection
    const redirectUrl = new URL(
      `/payment/${params.status}`,
      process.env.NEXT_PUBLIC_APP_URL
    );
    redirectUrl.searchParams.set('ref', reference);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      new URL('/payment/error', request.url)
    );
  }
}