// src/app/(public)/layout.tsx
import { AppLayout } from '@/components/layouts/AppLayout'
import { RootLayoutClient } from '@/components/layouts/RootLayoutClient'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayoutClient>
      <AppLayout>
        {children}
      </AppLayout>
    </RootLayoutClient>
  )
}