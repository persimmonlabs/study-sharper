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
  }, [file.id, file.title, file.content, file.updated_at])

  const hasChanges = useMemo(() => {
    return title !== savedTitle || content !== savedContent
  }, [title, savedTitle, content, savedContent])

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setTitle(savedTitle)
      event.currentTarget.blur()
    }
  }

  function handleCancel() {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?')
      if (!confirmed) return
    }
    setTitle(savedTitle)
    setContent(savedContent)
    onCancel?.()
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.')
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Title
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 text-3xl font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
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
        <div className="mt-4 flex flex-shrink-0 items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
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
      <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <TiptapEditor
          markdown={content}
          onChange={setContent}
        />
      </div>
    </div>
  )
}
