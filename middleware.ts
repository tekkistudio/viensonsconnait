// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  console.log('🔒 Middleware - URL:', req.nextUrl.pathname);
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  try {
    console.log('🔍 Vérification de la session...');
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Erreur session:', error);
      throw error;
    }

    console.log('📋 Session:', session ? 'Présente' : 'Absente');

    // Accès à /admin/login
    if (req.nextUrl.pathname === '/admin/login') {
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userData?.role === 'admin') {
          console.log('➡️ Redirection login -> dashboard (session admin active)');
          return NextResponse.redirect(new URL('/admin/dashboard', req.url));
        }
      }
      console.log('✅ Accès login autorisé (pas de session admin)');
      return res;
    }

    // Pour toutes les autres routes /admin/*
    if (!session) {
      console.log('➡️ Redirection vers login (pas de session)');
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    console.log('👤 Rôle admin:', isAdmin);

    if (!isAdmin) {
      console.log('❌ Rôle non admin, déconnexion...');
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    console.log('✅ Accès autorisé');
    return res;

  } catch (error) {
    console.error('❌ Erreur middleware:', error);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}

export const config = {
  matcher: [
    '/admin',
    '/admin/login',
    '/admin/dashboard/:path*',
    '/admin/orders/:path*',
    '/admin/products/:path*',
    '/admin/customers/:path*',
    '/admin/delivery/:path*',
    '/admin/marketing/:path*',
    '/admin/analytics/:path*',
    '/admin/settings/:path*'
  ]
}