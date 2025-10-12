'use client'

import Link from 'next/link'

interface QuickActionCardProps {
  title: string
  description: string
  icon: string
  href: string
  color: 'primary' | 'green' | 'purple' | 'orange' | 'blue'
}

const colorClasses = {
  primary: 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
  green: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
}

export function QuickActionCard({ title, description, icon, href, color }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <div className={`${colorClasses[color]} rounded-xl p-6 text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer group`}>
        <div className="flex items-start justify-between mb-3">
          <div className="text-4xl group-hover:scale-110 transition-transform duration-200">
            {icon}
          </div>
          <svg 
            className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm opacity-90">{description}</p>
      </div>
    </Link>
  )
}
