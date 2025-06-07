// src/app/api/test-conversion/route.ts
import { NextResponse } from "next/server";
import { convertCFAToEUR, debugConversion, OFFICIAL_FCFA_TO_EUR_RATE } from "@/lib/utils/currency";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const amount = url.searchParams.get('amount');
    const cfaAmount = amount ? parseInt(amount) : 28000; // Default 28,000 FCFA

    console.log('🧪 Testing currency conversion for:', cfaAmount, 'FCFA');
    
    // Test la conversion
    const eurCentimes = convertCFAToEUR(cfaAmount);
    const eurAmount = eurCentimes / 100;
    
    // Debug complet
    debugConversion(cfaAmount);
    
    // Tests avec différents montants
    const testAmounts = [14000, 28000, 42000, 56000];
    const testResults = testAmounts.map(amount => {
      const centimes = convertCFAToEUR(amount);
      return {
        fcfa: amount,
        eurCentimes: centimes,
        eurAmount: centimes / 100,
        formatted: `${amount.toLocaleString()} FCFA = ${(centimes / 100).toFixed(2)}€`
      };
    });

    return NextResponse.json({
      success: true,
      officialRate: OFFICIAL_FCFA_TO_EUR_RATE,
      testedAmount: {
        fcfa: cfaAmount,
        eurCentimes: eurCentimes,
        eurAmount: eurAmount,
        formatted: `${cfaAmount.toLocaleString()} FCFA = ${eurAmount.toFixed(2)}€`
      },
      testResults,
      note: "1 EUR = 655.957 XOF (taux officiel fixe)",
      stripeNote: "Montants Stripe en centimes d'EUR"
    });

  } catch (error: any) {
    console.error('❌ Conversion test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}