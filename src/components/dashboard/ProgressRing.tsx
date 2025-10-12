'use client'

interface ProgressRingProps {
  current: number
  target: number
  label: string
  color: 'green' | 'blue' | 'purple' | 'orange'
  size?: 'small' | 'medium' | 'large'
}

const colorClasses = {
  green: {
    ring: 'stroke-green-500',
    bg: 'stroke-gray-200 dark:stroke-gray-700',
    text: 'text-green-600 dark:text-green-400',
  },
  blue: {
    ring: 'stroke-blue-500',
    bg: 'stroke-gray-200 dark:stroke-gray-700',
    text: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    ring: 'stroke-purple-500',
    bg: 'stroke-gray-200 dark:stroke-gray-700',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    ring: 'stroke-orange-500',
    bg: 'stroke-gray-200 dark:stroke-gray-700',
    text: 'text-orange-600 dark:text-orange-400',
  },
}

const sizeConfig = {
  small: { radius: 35, stroke: 6, width: 90, height: 90, textSize: 'text-lg', labelSize: 'text-xs' },
  medium: { radius: 45, stroke: 8, width: 120, height: 120, textSize: 'text-2xl', labelSize: 'text-sm' },
  large: { radius: 60, stroke: 10, width: 160, height: 160, textSize: 'text-3xl', labelSize: 'text-base' },
}

export function ProgressRing({ current, target, label, color, size = 'medium' }: ProgressRingProps) {
  const percentage = Math.min((current / target) * 100, 100)
  const config = sizeConfig[size]
  const circumference = 2 * Math.PI * config.radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          className="transform -rotate-90"
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
        >
          {/* Background circle */}
          <circle
            className={colorClasses[color].bg}
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            strokeWidth={config.stroke}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            className={`${colorClasses[color].ring} transition-all duration-500 ease-out`}
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${config.textSize} font-bold ${colorClasses[color].text}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <div className={`${config.labelSize} font-medium text-gray-700 dark:text-gray-300 mt-3 text-center`}>
        {label}
      </div>
      <div className={`${config.labelSize} text-gray-500 dark:text-gray-400 mt-1`}>
        {current} / {target}
      </div>
    </div>
  )
}
