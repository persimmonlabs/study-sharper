'use client'

import { useState } from 'react'

interface AIAssistantButtonProps {
  onOpen?: () => void
}

export function AIAssistantButton({ onOpen }: AIAssistantButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (onOpen) {
      onOpen()
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Open AI Assistant"
    >
      <div className="relative">
        {/* Animated glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 blur-lg group-hover:opacity-100 animate-pulse"></div>
        
        {/* Main button */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg flex items-center justify-center text-white text-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
          🤖
        </div>
        
        {/* Notification dot (optional - can be used to show unread messages) */}
        {/* <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-bounce"></div> */}
      </div>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-fadeIn">
          AI Assistant
          <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"></div>
        </div>
      )}
    </button>
  )
}
