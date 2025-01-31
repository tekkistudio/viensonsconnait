// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { loginLimiter } from '@/lib/rate-limiter'
import type { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  
  // Obtenir l'IP de manière sécurisée
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    '127.0.0.1'
  
  try {
    // Vérifier le rate limit
    const { success, limit, reset, remaining } = await loginLimiter.limit(clientIp)
    
    if (!success) {
      return NextResponse.json({
        error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      })
    }

    const { email, password } = await request.json()

    // Vérification des champs
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email et mot de passe requis'
      }, { status: 400 })
    }

    // Tentative de connexion
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) throw signInError

    // Vérifier le rôle admin
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'admin') {
      await supabase.auth.signOut()
      throw new Error('Accès non autorisé')
    }

    // Logger la connexion réussie
    await supabase.from('auth_logs').insert([{
      user_id: user.id,
      action: 'login',
      ip_address: clientIp,
      user_agent: request.headers.get('user-agent'),
      success: true,
      metadata: {
        email,
        timestamp: new Date().toISOString()
      }
    }])

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata.role
      }
    })

  } catch (error) {
    // Logger l'échec de connexion
    await supabase.from('auth_logs').insert([{
      action: 'login_failed',
      ip_address: clientIp,
      user_agent: request.headers.get('user-agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      metadata: {
        timestamp: new Date().toISOString()
      }
    }])

    return NextResponse.json({
      error: 'Identifiants invalides'
    }, { status: 401 })
  }
}