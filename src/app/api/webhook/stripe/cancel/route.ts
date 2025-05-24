// src/app/api/webhook/stripe/cancel/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_API_URL}/?payment=cancelled`
  );
}