'use client'

import { useEffect, useMemo, useRef, useState, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { updateFolder, deleteFolder } from '@/lib/api/filesApi'
import type { FileFolder } from '@/types/files'
import { CreateFolderDialog } from './CreateFolderDialog'

interface FolderContextMenuProps {
  folder: FileFolder
  position: { x: number; y: number }
  onClose: () => void
  onFolderUpdated?: (folder: FileFolder) => void
  onFolderDeleted?: (folderId: string) => void
  parentFolders?: FileFolder[]
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

  const sortedParentFolders = useMemo(() => {
    return [...parentFolders].sort((a, b) => a.name.localeCompare(b.name))
  }, [parentFolders])

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

  const menuContent = (
    <div
      ref={menuRef}
      onClick={stopPropagation}
      className="fixed z-50 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Folder Options
      </div>

      <div className="rounded-md border border-slate-200">
        {renaming ? (
          <div className="space-y-2 px-3 py-2">
            <label className="text-xs font-medium text-slate-500">Rename Folder</label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
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
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setRenaming(true)}
          >
            <span>Rename Folder</span>
            <span className="text-xs text-slate-400">{folder.name}</span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-slate-200 px-3 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm text-slate-700 hover:text-blue-600"
          onClick={() => setShowColorPicker((prev) => !prev)}
        >
          <span>Change Color</span>
          <span className="flex items-center gap-2">
            <span className={`h-4 w-4 rounded-full ${COLOR_OPTIONS.find((c) => c.value === folder.color)?.className ?? 'bg-slate-300'}`} />
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`mr-2 h-3 w-3 rounded-full ${option.className}`} />
                {option.label}
              </button>
            ))}
          </div>
        )}
        {colorError && <p className="mt-2 text-xs text-red-600">{colorError}</p>}
      </div>

      <div className="rounded-md border border-slate-200 px-3 py-2">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Delete this folder?</p>
            <p className="text-xs text-slate-500">
              All files inside will remain but no longer be grouped.
            </p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
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
            className="flex w-full items-center justify-between text-sm text-red-600 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
          >
            <span>Delete Folder</span>
            <span className="text-xs text-red-300">Confirm</span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-slate-200">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={handleCreateSubfolder}
        >
          <span>Create Subfolder</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
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
