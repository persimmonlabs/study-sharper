'use client'

import { useState } from 'react'
import type { FileItem } from '@/types/files'
import { Edit2, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FileViewerProps {
  file: FileItem
  onEditClick: () => void
  onDeleteClick?: () => void
  isDeleting?: boolean
}

export function FileViewer({ file, onEditClick, onDeleteClick, isDeleting = false }: FileViewerProps) {
  const [showFullContent, setShowFullContent] = useState(false)

  const contentPreview = file.content || ''
  const isLongContent = contentPreview.length > 500
  const displayContent = showFullContent ? contentPreview : contentPreview.slice(0, 500)

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with Title and Edit Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {file.title || 'Untitled'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Last updated {file.updated_at ? formatDistanceToNow(new Date(file.updated_at), { addSuffix: true }) : 'Unknown'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDeleteClick?.()}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onEditClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition whitespace-nowrap"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Content Display */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm">
        {contentPreview ? (
          <div className="prose dark:prose-invert max-w-none overflow-y-auto h-full">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {displayContent}
              {isLongContent && !showFullContent && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowFullContent(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    Show more...
                  </button>
                </div>
              )}
              {isLongContent && showFullContent && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowFullContent(false)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    Show less
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
            No content yet. Click Edit to add content.
          </div>
        )}
      </div>

    </div>
  )
}
