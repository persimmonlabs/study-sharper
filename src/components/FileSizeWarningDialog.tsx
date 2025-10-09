'use client'

interface FileSizeWarningDialogProps {
  isOpen: boolean
  fileName: string
  fileSize: number
  maxSize: number
  onConfirm: () => void
  onCancel: () => void
}

export function FileSizeWarningDialog({
  isOpen,
  fileName,
  fileSize,
  maxSize,
  onConfirm,
  onCancel,
}: FileSizeWarningDialogProps) {
  if (!isOpen) return null

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              File Too Large for AI Features
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            <span className="font-medium">{fileName}</span> is too large to be included in AI-powered Study Tools.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">File size:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatBytes(fileSize)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">Maximum for AI:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatBytes(maxSize)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Would you like to upload anyway for general note storage? You'll still be able to view the PDF, but AI features like text extraction and chat won't be available.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Upload Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
