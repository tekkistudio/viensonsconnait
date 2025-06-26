// src/app/admin/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/components/admin/AuthProvider';

interface LoginError {
  message: string;
  remainingAttempts?: number;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const supabase = createClientComponentClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) throw signInError;

      // Vérifier le rôle admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      if (userError || !userData || userData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Accès non autorisé');
      }
      
      // La redirection sera gérée par useEffect quand isAuthenticated changera
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError({
        message: err instanceof Error ? 
          err.message === 'Invalid login credentials' ? 
            'Email ou mot de passe incorrect' : 
            err.message : 
          'Une erreur est survenue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pendant le chargement de l'authentification, montrer un loader
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  // Si déjà authentifié, ne rien afficher (la redirection sera gérée par useEffect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Section de gauche (visible uniquement sur desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2563EB] to-[#38B6FF] p-12">
        <div className="w-full h-full flex items-center justify-center">
          <div className="max-w-xl">
            <Image
              src="/images/logos/logo_dukka_white.svg"
              alt="Dukka"
              width={150}
              height={40}
              className="mb-12"
            />
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <blockquote className="text-xl leading-relaxed text-white mb-8">
                "Dukka est née d'une observation simple : en Afrique, l'achat n'est pas qu'une simple transaction, c'est avant tout une conversation, un échange humain. C'est par cette conversation que se construit la confiance, que s'échangent les informations sur les produits, et que se conclut la vente. Notre mission est de permettre aux e-commerçants de vendre comme l'Afrique achète."
              </blockquote>
              <footer className="text-white">
                - Ibuka Ndjoli, founder Dukka
              </footer>
            </div>
          </div>
        </div>
      </div>

      {/* Section de droite (formulaire) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo pour mobile */}
          <div className="lg:hidden mb-12 flex justify-center">
            <Image
              src="/images/logos/logo_dukka.svg"
              alt="Dukka"
              width={120}
              height={32}
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Connectez-vous 
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border text-gray-600 border-gray-300 focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-colors"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border text-gray-600 border-gray-300 focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error.message}
                  {error.remainingAttempts !== undefined && (
                    <p className="mt-1 text-sm">
                      {error.remainingAttempts} tentatives restantes
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[#2563EB] text-white rounded-lg hover:bg-[#2563EB]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}