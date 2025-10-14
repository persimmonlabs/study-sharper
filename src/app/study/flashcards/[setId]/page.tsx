'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Flashcard } from '@/types/flashcards'
import { FlashcardViewer } from '@/components/flashcards/FlashcardViewer'
import { AddManualCardDialog } from '@/components/flashcards/AddManualCardDialog'
import { getFlashcardsInSet, recordFlashcardReview } from '@/lib/api/flashcards'

interface PageProps {
  params: Promise<{ setId: string }> | { setId: string }
}

export default function FlashcardStudyPage({ params }: PageProps) {
  const router = useRouter()
  const [setId, setSetId] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState<'all' | 'review'>('all')
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  })

  useEffect(() => {
    // Handle both Promise and plain object params
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params
      setSetId(resolvedParams.setId)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (setId) {
      fetchFlashcards()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  const fetchFlashcards = async () => {
    if (!setId) return
    
    try {
      setLoading(true)
      const cards = await getFlashcardsInSet(setId)
      
      // Filter based on study mode
      const filteredCards = studyMode === 'review' 
        ? cards.filter(card => card.mastery_level < 3)
        : cards
      
      if (filteredCards.length === 0) {
        alert('No cards available for this mode!')
        router.push('/study/flashcards')
        return
      }
      
      // Shuffle cards for varied practice
      const shuffled = [...filteredCards].sort(() => Math.random() - 0.5)
      setFlashcards(shuffled)
      setCurrentIndex(0)
      setIsFlipped(false)
    } catch (error) {
      console.error('Failed to fetch flashcards:', error)
      alert('Failed to load flashcards. Please try again.')
      router.push('/study/flashcards')
    } finally {
      setLoading(false)
    }
  }

  const currentCard = flashcards[currentIndex]
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleReview = async (correct: boolean) => {
    if (!currentCard) return

    try {
      const updatedCard = await recordFlashcardReview({
        flashcard_id: currentCard.id,
        correct
      })

      // Update the card in the list
      setFlashcards(prev => prev.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      ))

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        correct: correct ? prev.correct + 1 : prev.correct,
        incorrect: !correct ? prev.incorrect + 1 : prev.incorrect,
        total: prev.total + 1
      }))

      // Auto-advance to next card
      setTimeout(() => {
        if (currentIndex < flashcards.length - 1) {
          handleNext()
        } else {
          // Session complete
          alert(`Session complete! 🎉\n\nCorrect: ${sessionStats.correct + (correct ? 1 : 0)}\nIncorrect: ${sessionStats.incorrect + (!correct ? 1 : 0)}`)
        }
      }, 500)
    } catch (error) {
      console.error('Failed to record review:', error)
      alert('Failed to record your answer. Please try again.')
    }
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    if (loading) return
    
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault()
        handleFlip()
        break
      case 'ArrowLeft':
        event.preventDefault()
        handlePrevious()
        break
      case 'ArrowRight':
        event.preventDefault()
        handleNext()
        break
      case '1':
        if (isFlipped) {
          event.preventDefault()
          handleReview(false)
        }
        break
      case '2':
        if (isFlipped) {
          event.preventDefault()
          handleReview(true)
        }
        break
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isFlipped, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No flashcards found</p>
          <Link href="/study/flashcards" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Flashcards
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link 
            href="/study/flashcards"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sets
          </Link>

          {/* Session Stats & Add Card Button */}
          <div className="flex items-center space-x-4 text-sm">
            <button
              onClick={() => setIsAddCardDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Card
            </button>
            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              ✓ {sessionStats.correct}
            </div>
            <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
              ✗ {sessionStats.incorrect}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <FlashcardViewer
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />

        {/* Navigation & Review Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          {!isFlipped ? (
            /* Show Flip Button */
            <div className="flex justify-center">
              <button
                onClick={handleFlip}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-md hover:shadow-lg"
              >
                🔄 Flip Card
              </button>
            </div>
          ) : (
            /* Show Review Buttons */
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                How well did you know this?
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handleReview(false)}
                  className="flex-1 max-w-xs px-6 py-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium border-2 border-red-300 dark:border-red-800"
                >
                  <div className="text-2xl mb-1">😕</div>
                  <div className="font-semibold">Didn&apos;t Know</div>
                  <div className="text-xs mt-1 opacity-75">(Press 1)</div>
                </button>
                <button
                  onClick={() => handleReview(true)}
                  className="flex-1 max-w-xs px-6 py-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium border-2 border-green-300 dark:border-green-800"
                >
                  <div className="text-2xl mb-1">😊</div>
                  <div className="font-semibold">Knew It!</div>
                  <div className="text-xs mt-1 opacity-75">(Press 2)</div>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Arrows */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-semibold">⌨️ Keyboard Shortcuts:</span>
            <span className="ml-4">Space/Enter = Flip</span>
            <span className="ml-4">← = Previous</span>
            <span className="ml-4">→ = Next</span>
            <span className="ml-4">1 = Didn&apos;t Know</span>
            <span className="ml-4">2 = Knew It</span>
          </div>
        </div>

        {/* Add Manual Card Dialog */}
        {setId && (
          <AddManualCardDialog
            isOpen={isAddCardDialogOpen}
            setId={setId}
            onClose={() => setIsAddCardDialogOpen(false)}
            onSuccess={(card) => {
              // Add the new card to the list
              setFlashcards(prev => [...prev, card])
            }}
          />
        )}
      </div>
    </div>
  )
}
