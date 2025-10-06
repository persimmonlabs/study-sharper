'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { ConfirmDialog } from '@/components/ConfirmDialog'

type Note = Database['public']['Tables']['notes']['Row']

interface NotePageProps {
  params: {
    id: string
  }
}

export default function NotePage({ params }: NotePageProps) {
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const fetchNote = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        setError('Note not found or you do not have permission to view it.')
        setNote(null)
      } else {
        setNote(data)
        setTitle(data.title)
        setContent(data.content ?? '')
        setTags(data.tags?.join(', ') ?? '')
      }
    } catch (error) {
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

  const handleSave = async () => {
    if (!note || !user) return

    setIsSaving(true)
    setError(null)

    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)

      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          tags: tagsArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', note.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setNote(data)
      setTitle(data.title)
      setContent(data.content ?? '')
      setTags(data.tags?.join(', ') ?? '')
      
      // Navigate back to notes page after successful save
      router.push('/notes')
    } catch (err) {
      setError('Failed to save note. Please try again.')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!note || !user || isDeleting) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Successfully deleted - redirect to notes page
      router.push('/notes')
    } catch (error) {
      console.error('Delete error:', error)
      setError('Failed to delete note. Please try again.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

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

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Note not found</h1>
        <p className="text-gray-600 mb-4">{error || 'The requested note could not be found.'}</p>
        <Link
          href="/notes"
          className="text-primary-600 hover:text-primary-700"
        >
          ← Back to Notes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/notes" className="text-gray-600 hover:text-gray-900">
          ← Back to Notes
        </Link>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-8 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            id="content"
            rows={15}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., biology, important, chapter 1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {note && (
          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Created: {new Date(note.created_at).toLocaleDateString()}</p>
            <p>Last updated: {new Date(note.updated_at).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message={note ? `Are you sure you want to delete "${note.title}"? This action cannot be undone.` : 'Are you sure you want to delete this note?'}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDestructive={true}
      />
    </div>
  )
}
