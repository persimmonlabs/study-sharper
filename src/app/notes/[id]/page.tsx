'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { NoteEditor } from '@/components/notes/NoteEditor'

type Note = Database['public']['Tables']['notes']['Row'] & {
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  extraction_method?: string
  error_message?: string
  original_filename?: string
  ocr_processed?: boolean
  edited_manually?: boolean
}

interface NotePageProps {
  params: {
    id: string
  }
}

export default function NotePage({ params }: NotePageProps) {
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const fetchNote = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setError('Authentication error. Please log in again.')
        return
      }

      const response = await fetch(`/api/notes/${params.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Note not found or you do not have permission to view it.')
        } else {
          setError('Failed to load note. Please try again.')
        }
        setNote(null)
        return
      }

      const data = await response.json()
      setNote(data)
    } catch (error) {
      console.error('Error fetching note:', error)
      setError('An unexpected error occurred while fetching the note.')
    } finally {
      setLoading(false)
    }
  }, [params.id, user])

  useEffect(() => {
    if (authLoading) return
    
    if (user) {
      fetchNote()
    } else {
      router.push(`/auth/login?next=/notes/${params.id}`)
    }
  }, [authLoading, user, fetchNote, router, params.id])

  const handleSave = async (text: string) => {
    if (!note || !user) return

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication error. Please log in again.')
      }

      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ extracted_text: text }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save note' }))
        throw new Error(errorData.detail || 'Failed to save note')
      }

      const updatedNote = await response.json()
      setNote(updatedNote)
    } catch (err) {
      console.error('Save error:', err)
      throw err
    }
  }

  const handleRetryProcessing = async () => {
    if (!note || !user || isRetrying) return

    setIsRetrying(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setError('Authentication error. Please log in again.')
        return
      }

      const response = await fetch(`/api/notes/${note.id}/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to retry processing')
      }

      // Refresh note to get updated status
      await fetchNote()
    } catch (err) {
      console.error('Retry error:', err)
      setError('Failed to retry processing. Please try again.')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDelete = async () => {
    if (!note || !user) return

    const confirmed = window.confirm(`Are you sure you want to delete "${note.title}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setError('Authentication error. Please log in again.')
        return
      }

      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      // Successfully deleted - redirect to notes page
      router.push('/notes')
    } catch (error) {
      console.error('Delete error:', error)
      setError('Failed to delete note. Please try again.')
    }
  }

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading note...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error && !note) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Note not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The requested note could not be found.'}</p>
          <Link
            href="/notes"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            ← Back to Notes
          </Link>
        </div>
      </div>
    )
  }

  if (!note) {
    return null
  }

  // Show processing status for pending/processing notes
  if (note.processing_status === 'pending' || note.processing_status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/notes" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 inline-block">
            ← Back to Notes
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {note.processing_status === 'pending' ? 'Processing Pending' : 'Processing Note'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your note is being processed. This may take a few moments.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              File: {note.original_filename || note.title}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state for failed processing
  if (note.processing_status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/notes" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 inline-block">
            ← Back to Notes
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Processing Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {note.error_message || 'An error occurred while processing this note.'}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleRetryProcessing}
                disabled={isRetrying}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
              >
                {isRetrying ? 'Retrying...' : 'Retry Processing'}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show editor for completed notes
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="h-screen flex flex-col">
        {/* Top navigation bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/notes" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                ← Back to Notes
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md">
                {note.title}
              </h1>
            </div>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
          <NoteEditor
            noteId={note.id}
            initialText={note.extracted_text || note.content || ''}
            updatedAt={note.updated_at}
            editedManually={note.edited_manually}
            onSave={handleSave}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </div>
      </div>
    </div>
  )
}
