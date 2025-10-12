'use client'

import { useEffect, useState } from 'react'

interface WelcomeBannerProps {
  firstName: string
  isFirstLogin?: boolean
  level: number
  xp: number
  tokens: number
}

export function WelcomeBanner({ firstName, isFirstLogin, level, xp, tokens }: WelcomeBannerProps) {
  const [greeting, setGreeting] = useState('Welcome back')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl shadow-lg">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-primary-500 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-primary-400 rounded-full opacity-20 blur-2xl"></div>
      
      <div className="relative px-8 py-6 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isFirstLogin ? `Welcome to Study Sharper, ${firstName}! 🎓` : `${greeting}, ${firstName}! 👋`}
          </h1>
          <p className="text-primary-100 text-lg">
            {isFirstLogin 
              ? "Let's start your learning journey!" 
              : "Ready to level up your learning today?"}
          </p>
        </div>
        
        {/* Stats pills */}
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-white">Level {level}</div>
            <div className="text-xs text-primary-100 mt-1">{xp} XP</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl px-4 py-3 text-center min-w-[100px] shadow-lg">
            <div className="text-2xl font-bold text-white">{tokens}</div>
            <div className="text-xs text-yellow-100 mt-1">🪙 Tokens</div>
          </div>
        </div>
      </div>
    </div>
  )
}
