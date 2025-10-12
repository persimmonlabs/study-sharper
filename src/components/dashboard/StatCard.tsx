'use client'

interface StatCardProps {
  icon: string
  value: string | number
  label: string
  color: 'primary' | 'green' | 'purple' | 'orange' | 'blue' | 'red' | 'yellow'
  trend?: {
    value: number
    label: string
  }
}

const colorClasses = {
  primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
}

export function StatCard({ icon, value, label, color, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colorClasses[color]} mb-3`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${colorClasses[color].split(' ')[2]}`}>
            {value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {label}
          </div>
          {trend && (
            <div className="mt-2 flex items-center">
              <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
