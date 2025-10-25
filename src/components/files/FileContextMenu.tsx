'use client'

import { useEffect, useMemo, useRef, useState, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { updateFile } from '@/lib/api/filesApi'
import type { FileItem, FileFolder } from '@/types/files'
import { ChevronLeft } from 'lucide-react'

interface FileContextMenuProps {
  file: FileItem
  position: { x: number; y: number }
  folders?: FileFolder[]
  onClose: () => void
  onFileUpdated?: (file: FileItem) => void
  onDeleteRequested?: (file: FileItem) => void
}

type MenuView = 'menu' | 'move'

export function FileContextMenu({
  file,
  position,
  folders = [],
  onClose,
  onFileUpdated,
  onDeleteRequested,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [view, setView] = useState<MenuView>('menu')
  const [menuMessage, setMenuMessage] = useState<string | null>(null)
  const [messageVariant, setMessageVariant] = useState<'error' | 'info'>('info')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) {
      return
    }

    const handleClickOutside = (event: MouseEvent | globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isClient, onClose])

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => a.name.localeCompare(b.name))
  }, [folders])

  useEffect(() => {
    setView('menu')
    setMenuMessage(null)
    setIsProcessing(false)
  }, [file])

  if (!isClient || typeof document === 'undefined') {
    return null
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  async function handleRename() {
    const suggestedTitle = file.title?.trim() ?? ''
    const newTitle = window.prompt('Rename file', suggestedTitle)

    if (newTitle === null) {
      return
    }

    const trimmedTitle = newTitle.trim()

    if (!trimmedTitle) {
      setMenuMessage('File name is required.')
      setMessageVariant('error')
      return
    }

    if (trimmedTitle === file.title) {
      onClose()
      return
    }

    setIsProcessing(true)
    setMenuMessage(null)

    try {
      const updated = await updateFile(file.id, { title: trimmedTitle })
      onFileUpdated?.(updated)
      onClose()
    } catch (error) {
      setMenuMessage(error instanceof Error ? error.message : 'Failed to rename file.')
      setMessageVariant('error')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleMove(targetFolderId: string | null) {
    const currentFolderId = file.folder_id ?? null

    if (targetFolderId === currentFolderId) {
      onClose()
      return
    }

    setIsProcessing(true)
    setMenuMessage(null)

    try {
      const updated = await updateFile(file.id, { folder_id: targetFolderId })
      onFileUpdated?.(updated)
      onClose()
    } catch (error) {
      setMenuMessage(error instanceof Error ? error.message : 'Failed to move file.')
      setMessageVariant('error')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleDelete() {
    onDeleteRequested?.(file)
    onClose()
  }

  const menuContent = (
    <div
      ref={menuRef}
      onClick={stopPropagation}
      className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-gray-900"
      style={{ left: position.x, top: position.y }}
    >
      {view === 'menu' ? (
        <div className="py-1 text-sm text-slate-700 dark:text-slate-200">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
            onClick={() => void handleRename()}
            disabled={isProcessing}
          >
            <span>Rename</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{file.title}</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
            onClick={() => {
              setView('move')
              setMenuMessage(null)
            }}
            disabled={isProcessing}
          >
            <span>Move</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {file.folder_id ? 'Change folder' : 'No folder'}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/20"
            onClick={handleDelete}
            disabled={isProcessing}
          >
            <span>Delete</span>
          </button>
        </div>
      ) : (
        <div className="py-1 text-sm text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => setView('menu')}
              disabled={isProcessing}
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
            {isProcessing && <span className="text-xs text-slate-400">Saving...</span>}
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
              onClick={() => void handleMove(null)}
              disabled={isProcessing}
            >
              <span>Remove from Folder</span>
              {!file.folder_id && <span className="text-xs text-blue-600 dark:text-blue-400">Current</span>}
            </button>
            {sortedFolders.map((folderOption) => {
              const isActive = folderOption.id === file.folder_id
              return (
                <button
                  key={folderOption.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
                  onClick={() => void handleMove(folderOption.id)}
                  disabled={isProcessing}
                >
                  <span>{folderOption.name}</span>
                  {isActive && <span className="text-xs text-blue-600 dark:text-blue-400">Current</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {menuMessage && (
        <div
          className={`border-t px-3 py-2 text-xs ${
            messageVariant === 'error'
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-300'
          }`}
        >
          {menuMessage}
        </div>
      )}
    </div>
  )

  return createPortal(menuContent, document.body)
}
