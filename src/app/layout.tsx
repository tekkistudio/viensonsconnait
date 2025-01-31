// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ScriptsLoader } from '../components/layouts/ScriptsLoader'
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
  title: 'VIENS ON S\'CONNAÎT - Des jeux de cartes pour tisser des liens plus forts',
  description: 'Découvrez nos jeux de société conçus pour renforcer vos relations avec votre partenaire, votre famille, vos amis, vos collègues, etc.',
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
      </head>
      <body className="bg-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}