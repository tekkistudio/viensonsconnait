// src/app/layout.tsx - VERSION CORRIGÉE
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ScriptsLoader } from '../components/layouts/ScriptsLoader'
import { ClientThemeWrapper } from '@/components/providers/ClientThemeWrapper'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'

// Configuration de la police Inter pour l'admin
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VIENS ON S\'CONNAÎT - Des jeux de cartes pour tisser des liens plus forts avec vos proches',
  description: 'Découvrez nos jeux de cartes conçus pour renforcer vos relations avec votre partenaire, votre famille, vos amis, vos collègues, etc.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <ScriptsLoader />
        {/* Styles Mapbox */}
        <link 
          href='https://api.mapbox.gl/mapbox-gl-js/v2.15.0/mapbox-gl.css' 
          rel='stylesheet' 
          crossOrigin="anonymous"
        />
        {/* Script pour initialiser le thème immédiatement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('vosc-theme') || 'light';
                const root = document.documentElement;
                
                // Appliquer la classe de thème
                root.classList.remove('light', 'dark');
                root.classList.add(savedTheme);
                
                // Forcer les variables CSS immédiatement
                if (savedTheme === 'light') {
                  root.style.setProperty('--bg-primary', '#ffffff');
                  root.style.setProperty('--bg-secondary', '#f8f9fa');
                  root.style.setProperty('--text-primary', '#1a1a1a');
                  root.style.setProperty('--text-secondary', '#6b7280');
                  root.style.setProperty('--header-bg', '#132D5D');
                  root.style.setProperty('--footer-bg', '#132D5D');
                  root.style.setProperty('--card-bg', '#ffffff');
                  root.style.setProperty('--border-color', '#e5e7eb');
                  document.body.style.backgroundColor = '#ffffff';
                } else {
                  root.style.setProperty('--bg-primary', '#000000');
                  root.style.setProperty('--bg-secondary', '#1a1a1a');
                  root.style.setProperty('--text-primary', '#ffffff');
                  root.style.setProperty('--text-secondary', '#9ca3af');
                  root.style.setProperty('--header-bg', '#000000');
                  root.style.setProperty('--footer-bg', '#000000');
                  root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.1)');
                  root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
                  document.body.style.backgroundColor = '#000000';
                }
              } catch (e) {
                document.documentElement.classList.add('light');
                document.body.style.backgroundColor = '#ffffff';
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased transition-all duration-300" suppressHydrationWarning>
        <ClientThemeWrapper>
          {children}
        </ClientThemeWrapper>
      </body>
    </html>
  )
}