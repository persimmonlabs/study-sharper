'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FlashcardSet, GenerateFlashcardsRequest } from '@/types/flashcards'
import { GenerateFlashcardsDialog } from '@/components/notes/GenerateFlashcardsDialog'
import { generateFlashcards, getFlashcardSets } from '@/lib/api/flashcards'

export default function FlashcardsPage() {
  const router = useRouter()
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchFlashcardSets()
  }, [])

  const fetchFlashcardSets = async () => {
    try {
      setLoading(true)
      const sets = await getFlashcardSets()
      setFlashcardSets(sets)
    } catch (error) {
      console.error('Failed to fetch flashcard sets:', error)
      setFlashcardSets([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (request: GenerateFlashcardsRequest) => {
    try {
      setIsGenerating(true)
      
      const newSet = await generateFlashcards(request)
      
      // Show success message
      alert(`✨ Successfully generated ${newSet.total_cards} flashcards!`)
      
      // Refresh list
      await fetchFlashcardSets()
      
      // Navigate to the new set
      router.push(`/study/flashcards/${newSet.id}`)
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
      const message = error instanceof Error ? error.message : 'Failed to generate flashcards'
      alert(`❌ ${message}. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard set?')) {
      return
    }

    try {
      // TODO: Implement API call to DELETE /api/flashcards/sets/:id
      console.log('Deleting set:', setId)
      
      // Refresh list
      await fetchFlashcardSets()
    } catch (error) {
      console.error('Failed to delete flashcard set:', error)
      alert('Failed to delete flashcard set. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/study" 
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-2 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Study Hub
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🎴 Flashcards
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI-generated flashcards with spaced repetition for optimal learning
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Set
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && flashcardSets.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Flashcard Sets Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first flashcard set from your notes. AI will generate intelligent Q&A pairs to help you master the material.
          </p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Set
          </button>
        </div>
      )}

      {/* Flashcard Sets Grid */}
      {!loading && flashcardSets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcardSets.map((set) => {
            const progress = set.total_cards > 0 
              ? (set.mastered_cards / set.total_cards) * 100 
              : 0

            return (
              <div
                key={set.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {set.title}
                    </h3>
                    {set.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {set.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(set.id)}
                    className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete set"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cards</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {set.mastered_cards} / {set.total_cards}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {formatDate(set.updated_at)}
                  </div>
                </div>

                {/* Action Button */}
                <Link href={`/study/flashcards/${set.id}`}>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Study Now
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Generate Flashcards Dialog */}
      {isDialogOpen && (
        <GenerateFlashcardsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  )
}
