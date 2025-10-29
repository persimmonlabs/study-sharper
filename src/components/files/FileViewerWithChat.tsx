'use client'

import { useState } from 'react'
import type { FileItem } from '@/types/files'
import { Edit2, Clock, Trash2, MessageCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TiptapEditor } from './TiptapEditor'
import { FileChatInterface } from '@/components/chat/FileChatInterface'

interface FileViewerProps {
  file: FileItem
  onEditClick: () => void
  onDeleteClick?: () => void
  isDeleting?: boolean
}

export function FileViewer({ file, onEditClick, onDeleteClick, isDeleting = false }: FileViewerProps) {
  const [showChat, setShowChat] = useState(false)
  const contentPreview = file.content || ''

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with Title and Buttons */}
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
            onClick={() => setShowChat(!showChat)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            {showChat ? 'Hide Chat' : 'Chat'}
          </button>
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

      {/* Content and Chat Layout */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* File Content */}
        <div className={`flex-1 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm transition-all duration-300 ${showChat ? 'w-2/3' : 'w-full'}`}>
          {contentPreview ? (
            <TiptapEditor
              markdown={contentPreview}
              onChange={() => {}}
              disabled={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
              No content yet. Click Edit to add content.
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-1/3 overflow-hidden rounded-lg shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-right-4">
            <FileChatInterface
              selectedFile={file}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
