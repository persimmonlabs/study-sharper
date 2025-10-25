'use client'

import { useEffect, useMemo, useRef, useState, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { updateFolder, deleteFolder } from '@/lib/api/filesApi'
import type { FileFolder } from '@/types/files'
import { CreateFolderDialog } from './CreateFolderDialog'
import { ChevronLeft } from 'lucide-react'

interface FolderContextMenuProps {
  folder: FileFolder
  position: { x: number; y: number }
  onClose: () => void
  onFolderUpdated?: (folder: FileFolder) => void
  onFolderDeleted?: (folderId: string) => void
  parentFolders?: FileFolder[]
  allFolders?: FileFolder[]
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'red', label: 'Red', className: 'bg-red-500' },
  { value: 'green', label: 'Green', className: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-400' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-400' },
]

export function FolderContextMenu({
  folder,
  position,
  onClose,
  onFolderUpdated,
  onFolderDeleted,
  parentFolders = [],
  allFolders = [],
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isSavingRename, setIsSavingRename] = useState(false)

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorError, setColorError] = useState<string | null>(null)
  const [isSavingColor, setIsSavingColor] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [view, setView] = useState<'menu' | 'move'>('menu')
  const [moveMessage, setMoveMessage] = useState<string | null>(null)
  const [moveMessageVariant, setMoveMessageVariant] = useState<'error' | 'info'>('info')
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setView('menu')
    setMoveMessage(null)
    setIsMoving(false)
  }, [folder])

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

  const sortedParentFolders = useMemo(() => {
    return [...parentFolders].sort((a, b) => a.name.localeCompare(b.name))
  }, [parentFolders])

  const availableFoldersForMove = useMemo(() => {
    return allFolders
      .filter((f) => {
        if (f.id === folder.id) return false
        if (f.parent_folder_id === folder.id) return false
        if (folder.depth >= 2) return false
        if (f.depth >= 2) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allFolders, folder])

  const colorMap = useMemo(
    () => ({
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-400',
      purple: 'bg-purple-500',
      pink: 'bg-pink-400',
    }),
    []
  )

  if (!isClient || typeof document === 'undefined') {
    return null
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  async function handleRename() {
    if (!newName.trim()) {
      setRenameError('Folder name is required.')
      return
    }

    if (newName.trim() === folder.name) {
      setRenaming(false)
      setRenameError(null)
      return
    }

    setIsSavingRename(true)
    setRenameError(null)

    try {
      const updated = await updateFolder(folder.id, { name: newName.trim() })
      onFolderUpdated?.(updated)
      setRenaming(false)
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Failed to rename folder.')
    } finally {
      setIsSavingRename(false)
    }
  }

  async function handleColorChange(color: string) {
    if (color === folder.color) {
      setShowColorPicker(false)
      return
    }

    setIsSavingColor(true)
    setColorError(null)

    try {
      const updated = await updateFolder(folder.id, { color })
      onFolderUpdated?.(updated)
      setShowColorPicker(false)
    } catch (error) {
      setColorError(error instanceof Error ? error.message : 'Failed to update color.')
    } finally {
      setIsSavingColor(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteFolder(folder.id)
      onFolderDeleted?.(folder.id)
      onClose()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete folder.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleCreateSubfolder() {
    setShowCreateDialog(true)
  }

  async function handleMoveFolder(targetParentId: string | null) {
    const currentParentId = folder.parent_folder_id ?? null

    if (targetParentId === currentParentId) {
      onClose()
      return
    }

    setIsMoving(true)
    setMoveMessage(null)

    try {
      const updated = await updateFolder(folder.id, { parent_folder_id: targetParentId })
      onFolderUpdated?.(updated)
      onClose()
    } catch (error) {
      setMoveMessage(error instanceof Error ? error.message : 'Failed to move folder.')
      setMoveMessageVariant('error')
    } finally {
      setIsMoving(false)
    }
  }

  const menuContent = (
    <div
      ref={menuRef}
      onClick={stopPropagation}
      className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-gray-900"
      style={{ left: position.x, top: position.y }}
    >
      {view === 'menu' ? (
        <div className="space-y-2 p-2">
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-400">
            Folder Options
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            {renaming ? (
              <div className="space-y-2 px-3 py-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Rename Folder</label>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-gray-800 dark:text-gray-100"
                  autoFocus
                />
                {renameError && <p className="text-xs text-red-600 dark:text-red-400">{renameError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-gray-700"
                    onClick={() => {
                      setRenaming(false)
                      setNewName(folder.name)
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
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800"
                onClick={() => setRenaming(true)}
              >
                <span>Rename Folder</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{folder.name}</span>
              </button>
            )}
          </div>

          <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              onClick={() => setShowColorPicker((prev) => !prev)}
            >
              <span>Change Color</span>
              <span className="flex items-center gap-2">
                <span className={`h-4 w-4 rounded-full ${COLOR_OPTIONS.find((c) => c.value === folder.color)?.className ?? 'bg-slate-300'}`} />
                <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {showColorPicker && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleColorChange(option.value)}
                    disabled={isSavingColor}
                    className={`flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium transition ${
                      folder.color === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className={`mr-2 h-3 w-3 rounded-full ${option.className}`} />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {colorError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{colorError}</p>}
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800"
              onClick={() => {
                setView('move')
                setMoveMessage(null)
              }}
              disabled={isMoving}
            >
              <span>Move Folder</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {folder.parent_folder_id ? 'In folder' : 'Root'}
              </span>
            </button>
          </div>

          <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete this folder?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All files inside will remain but no longer be grouped.
                </p>
                {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-gray-700"
                    onClick={() => {
                      setConfirmDelete(false)
                      setDeleteError(null)
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => setConfirmDelete(true)}
              >
                <span>Delete Folder</span>
                <span className="text-xs text-red-300 dark:text-red-500">Confirm</span>
              </button>
            )}
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800"
              onClick={handleCreateSubfolder}
            >
              <span>Create Subfolder</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-1 text-sm text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => setView('menu')}
              disabled={isMoving}
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
            {isMoving && <span className="text-xs text-slate-400 dark:text-slate-500">Saving...</span>}
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
              onClick={() => void handleMoveFolder(null)}
              disabled={isMoving}
            >
              <span>Root (No Parent)</span>
              {!folder.parent_folder_id && <span className="text-xs text-blue-600 dark:text-blue-400">Current</span>}
            </button>
            {availableFoldersForMove.map((folderOption) => {
              const isActive = folderOption.id === folder.parent_folder_id
              const colorClass = colorMap[folderOption.color as keyof typeof colorMap] || 'bg-slate-300'
              return (
                <button
                  key={folderOption.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-gray-700"
                  onClick={() => void handleMoveFolder(folderOption.id)}
                  disabled={isMoving}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colorClass}`} />
                    {folderOption.name}
                  </span>
                  {isActive && <span className="text-xs text-blue-600 dark:text-blue-400">Current</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {moveMessage && (
        <div
          className={`border-t px-3 py-2 text-xs ${
            moveMessageVariant === 'error'
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-300'
          }`}
        >
          {moveMessage}
        </div>
      )}
    </div>
  )

  return (
    <>
      {createPortal(menuContent, document.body)}
      {showCreateDialog && (
        <CreateFolderDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          parentFolders={sortedParentFolders}
          defaultParentId={folder.id}
          onCreated={() => {
            setShowCreateDialog(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
