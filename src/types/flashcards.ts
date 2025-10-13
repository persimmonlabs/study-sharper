/**
 * Flashcard System Types
 * Type definitions for AI-generated flashcards and spaced repetition
 */

export interface FlashcardSet {
  id: string
  user_id: string
  title: string
  description?: string
  source_note_ids: string[]
  total_cards: number
  mastered_cards: number
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: string
  user_id: string
  set_id: string
  front: string
  back: string
  explanation?: string
  position: number
  mastery_level: number  // 0-5
  times_reviewed: number
  times_correct: number
  times_incorrect: number
  last_reviewed_at?: string
  next_review_at?: string
  source_note_id?: string
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface FlashcardReview {
  id: string
  user_id: string
  flashcard_id: string
  set_id: string
  was_correct: boolean
  confidence_rating?: number  // 1-5
  time_spent_seconds?: number
  reviewed_at: string
}

export interface GenerateFlashcardsRequest {
  note_ids: string[]
  num_cards?: number  // default: 10
  difficulty?: 'easy' | 'medium' | 'hard'  // default: 'medium'
  set_title?: string
  set_description?: string
}

export interface GenerateFlashcardsResponse {
  success: boolean
  set: FlashcardSet
  flashcards: Flashcard[]
  count: number
}

export interface ReviewFlashcardRequest {
  was_correct: boolean
  confidence_rating?: number
  time_spent_seconds?: number
}

export interface ReviewFlashcardResponse {
  success: boolean
  mastery_level: number
  next_review_at: string
  interval_days: number
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy - Basic recall',
  medium: 'Medium - Comprehension',
  hard: 'Hard - Analysis & application'
}

export const MASTERY_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: 'New', color: 'text-gray-500' },
  1: { label: 'Learning', color: 'text-red-500' },
  2: { label: 'Familiar', color: 'text-orange-500' },
  3: { label: 'Proficient', color: 'text-yellow-500' },
  4: { label: 'Mastered', color: 'text-green-500' },
  5: { label: 'Expert', color: 'text-blue-500' }
}
