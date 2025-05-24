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
  store_id: string;
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

  // Fonction utilitaire pour vérifier/créer les paramètres du chatbot
  const ensureChatbotSettings = async (storeId: string) => {
    try {
      const { data: existingSettings, error: fetchError } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingSettings) {
        const defaultSettings = {
          store_id: storeId,
          bot_name: "Assistant",
          bot_role: "Assistant commercial",
          welcome_message: "Bonjour ! Comment puis-je vous aider ?",
          initial_message_template: "Je suis là pour répondre à vos questions.",
          primary_color: "#FF7E93",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('chatbot_settings')
          .insert([defaultSettings]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des paramètres chatbot:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          if (mounted) {
            setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email, role, store_id')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        if (!userData || userData.role !== 'admin') {
          if (mounted) {
            setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
          await supabase.auth.signOut();
          return;
        }

        // Vérifier/créer les paramètres du chatbot une fois authentifié
        await ensureChatbotSettings(userData.store_id);

        if (mounted) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: session.user.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              store_id: userData.store_id,
            },
          });
        }

      } catch (error) {
        console.error('Erreur de vérification auth:', error);
        if (mounted) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      } else {
        checkAuth();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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
      console.error('Erreur de déconnexion:', error);
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