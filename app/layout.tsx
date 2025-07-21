import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Elis Dashboard - Conversas WhatsApp',
  description: 'Dashboard para monitoramento de conversas WhatsApp integrado ao n8n',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 bg-gray-50 dark:bg-gray-900">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
} 