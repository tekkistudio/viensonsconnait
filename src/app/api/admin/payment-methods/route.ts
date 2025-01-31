// app/api/admin/payment-methods/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Payment methods fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const { id, isActive } = await request.json()

    const { data, error } = await supabase
      .from('payment_methods')
      .update({ isActive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Mettre à jour le cache du chatbot
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat/config/refresh`, {
      method: 'POST',
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Payment method update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment method' },
      { status: 500 }
    )
  }
}