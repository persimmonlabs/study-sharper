'use client'

import { useEffect, useMemo, useRef, useState, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { updateFile, deleteFile, retryFileProcessing } from '@/lib/api/filesApi'
import type { FileItem, FileFolder } from '@/types/files'

interface FileContextMenuProps {
  file: FileItem
  position: { x: number; y: number }
  folders?: FileFolder[]
  onClose: () => void
  onFileUpdated?: (file: FileItem) => void
  onFileDeleted?: (fileId: string) => void
  onRetry?: (fileId: string) => void
}

type MoveState = 'idle' | 'saving' | 'error'

type DeleteState = 'idle' | 'confirming' | 'deleting' | 'error'

export function FileContextMenu({
  file,
  position,
  folders = [],
  onClose,
  onFileUpdated,
  onFileDeleted,
  onRetry,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  const [renaming, setRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(file.title)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isSavingRename, setIsSavingRename] = useState(false)

  const [moveState, setMoveState] = useState<MoveState>('idle')
  const [moveError, setMoveError] = useState<string | null>(null)
  const [targetFolderId, setTargetFolderId] = useState<string | ''>(file.folder_id ?? '')

  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [retryError, setRetryError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

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
    setNewTitle(file.title)
    setRenameError(null)
    setRenaming(false)
    setTargetFolderId(file.folder_id ?? '')
    setMoveState('idle')
    setMoveError(null)
    setDeleteState('idle')
    setDeleteError(null)
    setRetryError(null)
    setIsRetrying(false)
  }, [file])

  if (!isClient || typeof document === 'undefined') {
    return null
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  async function handleRename() {
    if (!newTitle.trim()) {
      setRenameError('File name is required.')
      return
    }

    if (newTitle.trim() === file.title) {
      setRenaming(false)
      setRenameError(null)
      return
    }

    setIsSavingRename(true)
    setRenameError(null)

    try {
      const updated = await updateFile(file.id, { title: newTitle.trim() })
      onFileUpdated?.(updated)
      setRenaming(false)
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Failed to rename file.')
    } finally {
      setIsSavingRename(false)
    }
  }

  async function handleMoveFolder(folderId: string) {
    if (folderId === (file.folder_id ?? '')) {
      return
    }

    setMoveState('saving')
    setMoveError(null)

    try {
      const updated = await updateFile(file.id, { folder_id: folderId || null })
      onFileUpdated?.(updated)
      setMoveState('idle')
    } catch (error) {
      setMoveState('error')
      setMoveError(error instanceof Error ? error.message : 'Failed to move file.')
    }
  }

  function handleDownload() {
    if (!file.original_preview_path) {
      return
    }

    const link = document.createElement('a')
    link.href = file.original_preview_path
    link.download = file.original_filename ?? `${file.title}.download`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleDelete() {
    setDeleteState('deleting')
    setDeleteError(null)

    try {
      await deleteFile(file.id)
      onFileDeleted?.(file.id)
      onClose()
    } catch (error) {
      setDeleteState('error')
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete file.')
    }
  }

  async function handleRetry() {
    setIsRetrying(true)
    setRetryError(null)

    try {
      await retryFileProcessing(file.id)
      onRetry?.(file.id)
      onClose()
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Failed to retry processing.')
    } finally {
      setIsRetrying(false)
    }
  }

  const menuContent = (
    <div
      ref={menuRef}
      onClick={stopPropagation}
      className="fixed z-50 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        File Options
      </div>

      <div className="rounded-md border border-slate-200">
        {renaming ? (
          <div className="space-y-2 px-3 py-2">
            <label className="text-xs font-medium text-slate-500">Rename File</label>
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            {renameError && <p className="text-xs text-red-600">{renameError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setRenaming(false)
                  setNewTitle(file.title)
                  setRenameError(null)
                }}
                disabled={isSavingRename}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                onClick={handleRename}
                disabled={isSavingRename}
              >
                {isSavingRename ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setRenaming(true)}
          >
            <span>Rename File</span>
            <span className="text-xs text-slate-400">{file.title}</span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-slate-200 px-3 py-2">
        <label className="text-xs font-medium text-slate-500" htmlFor="move-folder-select">
          Move to Folder
        </label>
        <select
          id="move-folder-select"
          value={targetFolderId}
          onChange={(event) => {
            const selected = event.target.value
            setTargetFolderId(selected)
            void handleMoveFolder(selected)
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={moveState === 'saving'}
        >
          <option value="">No folder</option>
          {sortedFolders.map((folderOption) => (
            <option key={folderOption.id} value={folderOption.id}>
              {folderOption.name}
            </option>
          ))}
        </select>
        {moveState === 'saving' && <p className="mt-1 text-xs text-blue-600">Moving...</p>}
        {moveState === 'error' && moveError && (
          <p className="mt-1 text-xs text-red-600">{moveError}</p>
        )}
      </div>

      <div className="rounded-md border border-slate-200">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={handleDownload}
          disabled={!file.original_preview_path}
        >
          <span>Download File</span>
          <span className="text-xs text-slate-400">
            {file.original_preview_path ? 'Available' : 'Not available'}
          </span>
        </button>
        {!file.original_preview_path && (
          <p className="px-3 pb-2 text-xs text-slate-400">
            Original file not available for download.
          </p>
        )}
      </div>

      {file.processing_status === 'failed' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm text-amber-700 hover:text-amber-800"
            onClick={() => void handleRetry()}
            disabled={isRetrying}
          >
            <span>Retry Processing</span>
            <span className="text-xs">{isRetrying ? 'Retrying...' : 'Try again'}</span>
          </button>
          {retryError && <p className="mt-1 text-xs text-red-600">{retryError}</p>}
        </div>
      )}

      <div className="rounded-md border border-slate-200 px-3 py-2">
        {deleteState === 'confirming' || deleteState === 'deleting' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Delete this file?</p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setDeleteState('idle')
                  setDeleteError(null)
                }}
                disabled={deleteState === 'deleting'}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                onClick={() => void handleDelete()}
                disabled={deleteState === 'deleting'}
              >
                {deleteState === 'deleting' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm text-red-600 hover:text-red-700"
            onClick={() => setDeleteState('confirming')}
          >
            <span>Delete File</span>
            <span className="text-xs text-red-300">Confirm</span>
          </button>
        )}
      </div>
    </div>
  )

  return createPortal(menuContent, document.body)
}
