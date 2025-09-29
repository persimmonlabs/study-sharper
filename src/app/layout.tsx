import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

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
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center">
                  <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
                    Study Sharper
                  </Link>
                </div>
                <nav className="flex space-x-8">
                  <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/notes" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Notes
                  </Link>
                  <Link href="/calendar" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Calendar
                  </Link>
                  <Link href="/study" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Study
                  </Link>
                  <Link href="/social" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Social
                  </Link>
                  <Link href="/account" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Account
                  </Link>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
