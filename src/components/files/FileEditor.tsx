'use client'

import { useEffect, useMemo, useState, KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import { updateFile } from '@/lib/api/filesApi'
import type { FileItem } from '@/types/files'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface FileEditorProps {
  file: FileItem
  onSaved?: (file: FileItem) => void
  onError?: (error: Error) => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function FileEditor({ file, onSaved, onError }: FileEditorProps) {
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
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Markdown File
          </span>
          {isEditingTitle ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="mt-1 max-w-xl text-left text-2xl font-semibold text-slate-900 hover:text-blue-600"
              title="Click to edit title"
            >
              {title || 'Untitled file'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            Last saved: <span className="font-medium text-slate-700">{formatLastSaved()}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-6 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && <span className="text-blue-600">Saving...</span>}
            {saveStatus === 'saved' && !hasChanges && <span className="text-green-600">Saved</span>}
            {saveStatus === 'error' && <span className="text-red-600">Error saving changes</span>}
            {!hasChanges && saveStatus === 'idle' && <span className="text-slate-500">No changes</span>}
            {hasChanges && saveStatus !== 'saving' && (
              <span className="text-orange-600">Unsaved changes</span>
            )}
          </div>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(value) => setContent(value ?? '')}
          preview="edit"
          hideToolbar={false}
          height="100%"
          visibleDragbar={false}
          className="h-full"
        />
      </div>
    </div>
  )
}
