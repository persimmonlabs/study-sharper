'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getFlashcardSets } from '@/lib/api/flashcards'

interface StudyStats {
  flashcardSets: number
  quizzes: number
  exams: number
}

export default function Study() {
  const [stats, setStats] = useState<StudyStats>({
    flashcardSets: 0,
    quizzes: 0,
    exams: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const flashcardSets = await getFlashcardSets()
        setStats(prev => ({
          ...prev,
          flashcardSets: flashcardSets.length
        }))
      } catch (error) {
        console.error('Failed to fetch study stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">📚 Study Hub</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Master your knowledge with AI-powered study tools
        </p>
      </div>

      {/* Main Study Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Flashcards */}
        <Link href="/study/flashcards">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer text-white group">
            <div className="flex items-center justify-between mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-3xl font-bold">{stats.flashcardSets}</div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Flashcards</h3>
            <p className="text-blue-100 text-sm mb-4">
              AI-generated flashcards with spaced repetition for optimal learning
            </p>
            <div className="flex items-center text-sm font-medium group-hover:translate-x-1 transition-transform">
              <span>Start Studying</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Quizzes - Coming Soon */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            SOON
          </div>
          <div className="flex items-center justify-between mb-4 opacity-50">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-3xl font-bold text-gray-400">{stats.quizzes}</div>
          </div>
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">📝 Quizzes</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Test your knowledge with AI-generated quizzes and instant feedback
          </p>
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
            Coming Soon
          </div>
        </div>

        {/* Practice Exams - Coming Soon */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            SOON
          </div>
          <div className="flex items-center justify-between mb-4 opacity-50">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <div className="text-3xl font-bold text-gray-400">{stats.exams}</div>
          </div>
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">📊 Practice Exams</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Comprehensive practice exams with detailed performance analytics
          </p>
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
            Coming Soon
          </div>
        </div>
      </div>

      {/* Recent Activity Section - Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Recent Activity</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No recent study activity yet. Start studying to see your progress here!</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-200 mb-2">AI-Powered Learning</h3>
            <p className="text-purple-800 dark:text-purple-300">
              All study features use AI to generate personalized content from your notes. Upload your study materials to the Notes page, then come here to create flashcards, quizzes, and practice exams!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
