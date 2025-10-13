import type { 
  GenerateFlashcardsRequest, 
  FlashcardSet, 
  Flashcard,
  RecordReviewRequest 
} from '@/types/flashcards'

/**
 * Generate flashcards from notes using AI
 */
export async function generateFlashcards(
  request: GenerateFlashcardsRequest
): Promise<FlashcardSet> {
  const response = await fetch('/api/flashcards/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate flashcards')
  }

  return response.json()
}

/**
 * Fetch all flashcard sets for the current user
 */
export async function getFlashcardSets(): Promise<FlashcardSet[]> {
  const response = await fetch('/api/flashcards/sets', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch flashcard sets')
  }

  return response.json()
}

/**
 * Fetch all flashcards in a specific set
 */
export async function getFlashcardsInSet(setId: string): Promise<Flashcard[]> {
  const response = await fetch(`/api/flashcards/sets/${setId}/cards`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch flashcards')
  }

  return response.json()
}

/**
 * Record a flashcard review
 */
export async function recordFlashcardReview(
  request: RecordReviewRequest
): Promise<Flashcard> {
  const response = await fetch('/api/flashcards/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to record review')
  }

  return response.json()
}
