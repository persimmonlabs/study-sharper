'use client'

import { useEffect, useRef } from 'react'

type FolderOption = {
  id: string
  name: string
  color: string
}

interface NoteContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onClose: () => void
  folders?: FolderOption[]
  currentFolderId?: string | null
  onMove?: (folderId: string | null) => void
}

export function NoteContextMenu({ x, y, onDelete, onClose, folders = [], currentFolderId = null, onMove }: NoteContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleMove = (folderId: string | null) => {
    if (onMove) {
      onMove(folderId)
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {onMove && (
        <div className="px-4 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Move to folder</p>
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                className={`w-full flex items-center text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  currentFolderId === folder.id
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full mr-3" style={{ backgroundColor: folder.color }} />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

      <button
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete Note</span>
      </button>
    </div>
  )
}
