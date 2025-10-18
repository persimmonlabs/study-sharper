'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

// Dynamically import the markdown preview component
const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
)

interface NoteEditorProps {
  noteId: string
  initialText: string
  updatedAt?: string
  editedManually?: boolean
  onSave: (text: string) => Promise<void>
  onUnsavedChanges?: (hasChanges: boolean) => void
}

export function NoteEditor({
  noteId,
  initialText,
  updatedAt,
  editedManually,
  onSave,
  onUnsavedChanges
}: NoteEditorProps) {
  const [text, setText] = useState(initialText)
  const [savedText, setSavedText] = useState(initialText)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(updatedAt ? new Date(updatedAt) : null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasUnsavedChanges = text !== savedText

  // Character count
  const charCount = text.length
  const byteCount = new Blob([text]).size

  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onUnsavedChanges])

  // Auto-save function
  const performSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(text)
      setSavedText(text)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save note:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }, [text, hasUnsavedChanges, isSaving, onSave])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (hasUnsavedChanges) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      // Set new timer for 30 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        performSave()
      }, 30000)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasUnsavedChanges, performSave])

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges) {
          performSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, performSave])

  // Handle text change
  const handleChange = (value?: string) => {
    setText(value || '')
  }

  // Manual save button
  const handleManualSave = () => {
    performSave()
  }

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - lastSaved.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    
    return lastSaved.toLocaleTimeString()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Note
          </h2>
          
          {editedManually && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">
              Manually Edited
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Character count */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {charCount.toLocaleString()} chars
            {byteCount > 900000 && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                ({(byteCount / 1024 / 1024).toFixed(2)}MB / 1MB)
              </span>
            )}
          </div>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>

          {/* Save button */}
          <button
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              hasUnsavedChanges && !isSaving
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {/* Save status */}
            {isSaving && (
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </div>
            )}
            
            {!isSaving && hasUnsavedChanges && (
              <div className="text-orange-600 dark:text-orange-400">
                Unsaved changes
              </div>
            )}
            
            {!isSaving && !hasUnsavedChanges && (
              <div className="text-green-600 dark:text-green-400">
                All changes saved
              </div>
            )}

            {/* Last saved */}
            <div className="text-gray-500 dark:text-gray-400">
              Last saved: {formatLastSaved()}
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="text-gray-500 dark:text-gray-400">
            Auto-saves every 30 seconds • Press Ctrl+S to save
          </div>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Error: {saveError}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-auto p-6 prose dark:prose-invert max-w-none">
            <MarkdownPreview source={text} />
          </div>
        ) : (
          <div className="h-full" data-color-mode="light">
            <MDEditor
              value={text}
              onChange={handleChange}
              preview="edit"
              hideToolbar={false}
              height="100%"
              visibleDragbar={false}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
