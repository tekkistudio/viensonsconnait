// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { RootLayoutClient } from '../components/layouts/RootLayoutClient'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'

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
    <html lang="fr">
      <body className="font-sans">
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  )
}