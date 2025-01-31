// src/components/admin/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/admin/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });
  
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    let mounted = true;
  
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) {
            setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
          if (!publicRoutes.includes(pathname)) {
            router.push('/admin/login');
          }
          return;
        }
  
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('id', session.user.id)
          .single();
  
        if (userError || !userData || userData.role !== 'admin') {
          if (mounted) {
            setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
          await supabase.auth.signOut();
          if (!publicRoutes.includes(pathname)) {
            router.push('/admin/login');
          }
          return;
        }
  
        if (mounted) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: session.user.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
            },
          });
        }
  
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
        if (!publicRoutes.includes(pathname)) {
          router.push('/admin/login');
        }
      }
    };
  
    checkAuth();
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        if (!publicRoutes.includes(pathname)) {
          router.push('/admin/login');
        }
      } else {
        checkAuth();
      }
    });
  
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        user: state.user,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};