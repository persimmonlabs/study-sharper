'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase, type Database } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PdfViewer } from '@/components/documents/PdfViewer'
import { DocxViewer } from '@/components/documents/DocxViewer'
import { noteCache } from '@/lib/noteCache'

interface Note {
  id: string
  title: string
  content: string | null
  tags: string[] | null
  file_path: string | null
  extracted_text: string | null
  file_size: number | null
  folder_id: string | null
  created_at: string
  updated_at: string
}

type NoteFolder = Database['public']['Tables']['note_folders']['Row']

interface NoteModalProps {
  note: Note | null
  isOpen: boolean
  onClose: () => void
  onDeleted?: () => void
  folders?: NoteFolder[]
  onUpdated?: (updated: { id: string; folder_id: string | null }) => void
}

export function NoteModal({ note, isOpen, onClose, onDeleted, folders = [], onUpdated }: NoteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(note?.folder_id ?? null)
  const [fullNote, setFullNote] = useState<Note | null>(note)
  const [isLoadingFullNote, setIsLoadingFullNote] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const extractedText = fullNote?.extracted_text?.trim()?.length ? fullNote?.extracted_text : (fullNote?.content?.trim()?.length ? fullNote?.content : null)
  const isDocx = fullNote?.file_path?.endsWith('.docx')
  const isPdf = fullNote?.file_path?.endsWith('.pdf')

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

  // Fetch full note content when modal opens
  useEffect(() => {
    if (!note || !isOpen) {
      return
    }

    const loadFullNote = async () => {
      // Check cache first
      const cached = noteCache.get(note.id)
      if (cached) {
        console.log(`[NoteModal] Cache hit for note ${note.id}`)
        setFullNote(cached)
        return
      }

      // If note already has content, it's already full
      if (note.content !== undefined || note.extracted_text !== undefined) {
        setFullNote(note)
        noteCache.set(note.id, note)
        return
      }

      // Fetch full note from API
      console.log(`[NoteModal] Fetching full note ${note.id}`)
      setIsLoadingFullNote(true)

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.access_token) {
          console.error('[NoteModal] No session token')
          setFullNote(note) // Fallback to lightweight note
          setIsLoadingFullNote(false)
          return
        }

        const response = await fetch(`/api/files/${note.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          console.error('[NoteModal] Failed to fetch full note:', response.status)
          setFullNote(note) // Fallback to lightweight note
          setIsLoadingFullNote(false)
          return
        }

        const data = await response.json()
        setFullNote(data)
        noteCache.set(note.id, data)
        console.log(`[NoteModal] Full note loaded and cached`)
      } catch (error) {
        console.error('[NoteModal] Error fetching full note:', error)
        setFullNote(note) // Fallback to lightweight note
      } finally {
        setIsLoadingFullNote(false)
      }
    }

    loadFullNote()
  }, [note, isOpen])

  useEffect(() => {
    setShowDeleteConfirm(false)
    setIsDeleting(false)
    setSelectedFolderId(note?.folder_id ?? null)
  }, [note?.id, note?.folder_id])

  useEffect(() => {
    let isMounted = true

    const loadFile = async () => {
      if (!fullNote?.file_path) {
        if (isMounted) {
          setFileUrl(null)
          setFileError(null)
          setFileLoading(false)
        }
        return
      }

      try {
        if (isMounted) {
          setFileLoading(true)
          setFileError(null)
        }

        const { data, error } = await supabase.storage
          .from('notes-pdfs')
          .createSignedUrl(fullNote.file_path, 60 * 60)

        if (!isMounted) return

        if (error || !data?.signedUrl) {
          console.error('Failed to load file preview', error)
          setFileUrl(null)
          setFileError('Unable to load file preview. You can download the file instead.')
        } else {
          setFileUrl(data.signedUrl)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Unexpected error loading file preview', error)
        setFileError('Unexpected error loading file preview. Please try again later.')
        setFileUrl(null)
      } finally {
        if (isMounted) {
          setFileLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      isMounted = false
    }
  }, [fullNote])

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!note || !user) return

    setIsDeleting(true)
    try {
      if (note.file_path) {
        await supabase.storage.from('notes-pdfs').remove([note.file_path])
      }

      const { error: dbError } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      setShowDeleteConfirm(false)
      setIsDeleting(false)

      onClose()

      if (onDeleted) {
        onDeleted()
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete note. Please try again.')
    }
  }

  const handleFolderChange = async (folderId: string | null) => {
    if (!note || !user) return
    if (folderId === note.folder_id) return

    setIsUpdatingFolder(true)
    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId })
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (error) throw error

      setSelectedFolderId(folderId)

      onUpdated?.({ id: note.id, folder_id: folderId })
    } catch (error) {
      console.error('Failed to update folder:', error)
      alert('Failed to update folder. Please try again.')
      setSelectedFolderId(note.folder_id ?? null)
    } finally {
      setIsUpdatingFolder(false)
    }
  }

  if (!isOpen || !note) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-hidden max-w-5xl lg:max-w-6xl relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{note.title}</h2>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400 space-x-4">
              <span>Created: {note.created_at ? new Date(note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
              <span>•</span>
              <span>Updated: {note.updated_at ? new Date(note.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>
          {folders.length > 0 && (
            <div className="ml-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Folder</label>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <select
                    value={selectedFolderId ?? ''}
                    onChange={(e) => handleFolderChange(e.target.value || null)}
                    disabled={isUpdatingFolder}
                    className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {selectedFolderId && (
                  <span
                    className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: folders.find(f => f.id === selectedFolderId)?.color ?? '#d1d5db' }}
                  />
                )}
              </div>
            </div>
          )}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-16">
          {isLoadingFullNote && (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Loading note content...</p>
              </div>
            </div>
          )}

          {!isLoadingFullNote && fileLoading && (
            <div className="h-96 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">Loading preview…</div>
            </div>
          )}

          {!fileLoading && fileError && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {fileError}
            </div>
          )}

          {!fileLoading && fileUrl && isPdf && (
            <div className="space-y-4 pb-6">
              <PdfViewer src={fileUrl} title={note.title} />
            </div>
          )}

          {!fileLoading && fileUrl && isDocx && (
            <div className="space-y-4 pb-6">
              <DocxViewer src={fileUrl} title={note.title} />
            </div>
          )}

          {!fileUrl && !fileLoading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No content is available for this note.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
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
              href={`/files/${note.id}`}
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
