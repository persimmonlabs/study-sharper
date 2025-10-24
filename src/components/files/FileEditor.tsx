'use client'

import { useEffect, useMemo, useState, KeyboardEvent } from 'react'
import { updateFile } from '@/lib/api/filesApi'
import type { FileItem } from '@/types/files'
import { X, Check } from 'lucide-react'
import { TiptapEditor } from './TiptapEditor'

interface FileEditorProps {
  file: FileItem
  onSaved?: (file: FileItem) => void
  onError?: (error: Error) => void
  onCancel?: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function FileEditor({ file, onSaved, onError, onCancel }: FileEditorProps) {
  const [title, setTitle] = useState(file.title)
  const [content, setContent] = useState(file.content ?? '')
  const [savedTitle, setSavedTitle] = useState(file.title)
  const [savedContent, setSavedContent] = useState(file.content ?? '')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    file.updated_at ? new Date(file.updated_at) : null
  )


  useEffect(() => {
    setTitle(file.title)
    setContent(file.content ?? '')
    setSavedTitle(file.title)
    setSavedContent(file.content ?? '')
    setLastSavedAt(file.updated_at ? new Date(file.updated_at) : null)
    setSaveStatus('idle')
    setError(null)
    setIsEditingTitle(false)
  }, [file.id, file.title, file.content, file.updated_at])

  const hasChanges = useMemo(() => {
    return title !== savedTitle || content !== savedContent
  }, [title, savedTitle, content, savedContent])

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      setIsEditingTitle(false)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setTitle(savedTitle)
      setIsEditingTitle(false)
    }
  }

  function handleCancel() {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?')
      if (!confirmed) return
    }
    setTitle(savedTitle)
    setContent(savedContent)
    setIsEditingTitle(false)
    onCancel?.()
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.')
      setIsEditingTitle(true)
      return
    }

    if (!hasChanges) {
      return
    }

    setSaveStatus('saving')
    setError(null)

    try {
      const updated = await updateFile(file.id, {
        title: title.trim(),
        content
      })

      setSavedTitle(updated.title)
      setSavedContent(updated.content ?? '')
      setTitle(updated.title)
      setContent(updated.content ?? '')
      setSaveStatus('saved')
      setLastSavedAt(updated.updated_at ? new Date(updated.updated_at) : new Date())
      onSaved?.(updated)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes.'
      setError(message)
      setSaveStatus('error')

      if (onError && err instanceof Error) {
        onError(err)
      }
    }
  }

  function formatLastSaved() {
    if (!lastSavedAt) {
      return 'Never'
    }

    const now = new Date()
    const diffMs = now.getTime() - lastSavedAt.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    if (diffSeconds < 60) {
      return 'Just now'
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    }

    return lastSavedAt.toLocaleTimeString()
  }


  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with Title and Action Buttons */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="text-3xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title="Click to edit title"
            >
              {title || 'Untitled'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Cancel editing"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || saveStatus !== 'idle') && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && <span className="text-blue-600 dark:text-blue-400">Saving...</span>}
            {saveStatus === 'saved' && !hasChanges && <span className="text-green-600 dark:text-green-400">✓ Saved</span>}
            {saveStatus === 'error' && <span className="text-red-600 dark:text-red-400">Error saving changes</span>}
            {hasChanges && saveStatus !== 'saving' && (
              <span className="text-orange-600 dark:text-orange-400">● Unsaved changes</span>
            )}
          </div>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <TiptapEditor
          markdown={content}
          onChange={setContent}
        />
      </div>
    </div>
  )
}
