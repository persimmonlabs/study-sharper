'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Note {
  id: string
  title: string
  content: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

interface NoteModalProps {
  note: Note | null
  isOpen: boolean
  onClose: () => void
  onDeleted?: () => void
}

export function NoteModal({ note, isOpen, onClose, onDeleted }: NoteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!note || !user) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Close modal and dialog
      setShowDeleteConfirm(false)
      onClose()

      // Navigate to trigger fresh data load
      // Add timestamp to force route refresh
      const timestamp = new Date().getTime()
      router.push(`${pathname}?refresh=${timestamp}`)
      
      // Alternative: use router.refresh() for server-side refresh
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete note. Please try again.')
      setIsDeleting(false)
    }
  }

  if (!isOpen || !note) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-hidden max-w-5xl lg:max-w-6xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{note.title}</h2>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400 space-x-4">
              <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close note"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {note.content ? (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                {note.content}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>This note has no content</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Note ID: {note.id}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="px-4 py-2 text-red-700 dark:text-red-400 bg-white dark:bg-gray-600 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
            <a
              href={`/notes/${note.id}`}
              className="px-4 py-2 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors inline-block"
            >
              Edit Note
            </a>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message={`Are you sure you want to delete "${note.title}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDestructive={true}
      />
    </div>
  )
}
