import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { HeaderNav } from '@/components/HeaderNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Study Sharper',
  description: 'AI-powered study assistant for better learning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Study Sharper
                  </div>
                  <HeaderNav />
                </div>
              </div>
              </header>
              <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
