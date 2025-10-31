import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/components/common/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ProcessingProvider } from '@/context/ProcessingContext'
import { ProcessingBar } from '@/components/ProcessingBar'

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
            <ProcessingProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
              {/* Sidebar Navigation */}
              <Sidebar />
              
              {/* Main Content Area */}
              <div className="flex flex-col flex-1 min-h-screen">
                {/* Top Bar */}
                <TopBar />
                
                {/* Page Content */}
                <main className="flex-1 min-h-0 p-6 overflow-hidden">
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
            </div>
            <ProcessingBar />
            </ProcessingProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
