'use client'

import { useState } from 'react'
import type { Flashcard } from '@/types/flashcards'

interface FlashcardViewerProps {
  card: Flashcard
  isFlipped: boolean
  onFlip: () => void
}

export function FlashcardViewer({ card, isFlipped, onFlip }: FlashcardViewerProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleFlip = () => {
    if (isAnimating) return
    setIsAnimating(true)
    onFlip()
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Get color based on mastery level
  const getMasteryColor = () => {
    switch (card.mastery_level) {
      case 0:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
      case 1:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 2:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 3:
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
    }
  }

  const getMasteryBadge = () => {
    switch (card.mastery_level) {
      case 0:
        return { text: 'New', color: 'bg-gray-500' }
      case 1:
        return { text: 'Learning', color: 'bg-red-500' }
      case 2:
        return { text: 'Reviewing', color: 'bg-yellow-500' }
      case 3:
        return { text: 'Mastered', color: 'bg-green-500' }
      default:
        return { text: 'New', color: 'bg-gray-500' }
    }
  }

  const badge = getMasteryBadge()

  return (
    <div className="relative w-full max-w-3xl mx-auto perspective-1000">
      {/* Mastery Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <span className={`${badge.color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
          {badge.text}
        </span>
      </div>

      {/* Flashcard */}
      <div
        onClick={handleFlip}
        className={`relative w-full h-96 cursor-pointer transition-transform duration-300 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front Side (Question) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl shadow-2xl border-2 p-8 flex flex-col justify-center items-center ${getMasteryColor()}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
            QUESTION
          </div>
          <p className="text-2xl text-center text-gray-900 dark:text-white font-medium">
            {card.question}
          </p>
          <div className="absolute bottom-6 text-sm text-gray-500 dark:text-gray-400">
            Click to reveal answer
          </div>
        </div>

        {/* Back Side (Answer) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl shadow-2xl border-2 p-8 flex flex-col justify-center items-center ${getMasteryColor()}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
            ANSWER
          </div>
          <p className="text-2xl text-center text-gray-900 dark:text-white font-medium mb-6">
            {card.answer}
          </p>
          {card.hint && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <span className="font-semibold">💡 Hint: </span>
                {card.hint}
              </p>
            </div>
          )}
          <div className="absolute bottom-6 text-sm text-gray-500 dark:text-gray-400">
            Click to see question
          </div>
        </div>
      </div>

      {/* Review Stats (Below Card) */}
      <div className="mt-6 flex justify-center items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Reviews: {card.review_count}</span>
        </div>
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Streak: {card.correct_streak}</span>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}
