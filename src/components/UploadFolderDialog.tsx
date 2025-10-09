'use client'

import { useEffect, useRef, useState } from 'react'

interface FolderOption {
  id: string
  name: string
  color: string
}

interface UploadFolderDialogProps {
  isOpen: boolean
  folders: FolderOption[]
  onCancel: () => void
  onSelectFolder: (folderId: string | null) => void
  canCreateFolder: boolean
  folderColors: string[]
  onCreateFolder?: (name: string, color: string) => Promise<FolderOption | null>
}

export function UploadFolderDialog({
  isOpen,
  folders,
  onCancel,
  onSelectFolder,
  canCreateFolder,
  folderColors,
  onCreateFolder
}: UploadFolderDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(folderColors[0] ?? '#3b82f6')
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  useEffect(() => {
    if (!isOpen) {
      setShowCreate(false)
      setNewFolderName('')
      setSelectedColor(folderColors[0] ?? '#3b82f6')
      setIsCreating(false)
      setErrorMessage(null)
    }
  }, [isOpen, folderColors])

  const handleCreateFolder = async () => {
    if (!onCreateFolder) return
    if (!newFolderName.trim()) {
      setErrorMessage('Folder name is required')
      return
    }
    setIsCreating(true)
    setErrorMessage(null)
    try {
      const folder = await onCreateFolder(newFolderName.trim(), selectedColor)
      if (folder) {
        setShowCreate(false)
        setNewFolderName('')
        onSelectFolder(folder.id)
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create folder')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Choose upload folder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Where would you like to store the uploaded file?
        </p>
        {canCreateFolder && onCreateFolder && (
          <div className="mb-4">
            <button
              onClick={() => setShowCreate(prev => !prev)}
              className="text-sm font-medium text-primary-600 dark:text-primary-300 hover:underline"
            >
              {showCreate ? 'Cancel new folder' : '+ Create new folder'}
            </button>
          </div>
        )}
        {showCreate && canCreateFolder && onCreateFolder && (
          <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/40 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 mb-2">Folder name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Biology"
              />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 dark:text-gray-300 mb-2">Color</span>
              <div className="flex flex-wrap gap-2">
                {folderColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${selectedColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'} focus:outline-none transition-transform hover:scale-105`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color} color`}
                  />
                ))}
              </div>
            </div>
            {errorMessage && (
              <p className="text-xs text-red-500">{errorMessage}</p>
            )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreate(false)
                  setNewFolderName('')
                  setErrorMessage(null)
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isCreating}
                className="px-3 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create & use folder'}
              </button>
            </div>
          </div>
        )}
        {!canCreateFolder && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Folder limit reached. Delete an existing folder to add a new one.</p>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <button
            onClick={() => onSelectFolder(null)}
            className="w-full flex items-center px-3 py-2 rounded-lg border border-transparent hover:border-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <span className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 mr-3" />
            <span className="text-left text-sm text-gray-900 dark:text-gray-100">All notes</span>
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className="w-full flex items-center px-3 py-2 rounded-lg border border-transparent hover:border-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: folder.color }} />
              <span className="text-left text-sm text-gray-900 dark:text-gray-100">{folder.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
