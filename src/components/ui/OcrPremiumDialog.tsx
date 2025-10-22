'use client'

import { useEffect, useRef } from 'react'

interface OcrPremiumDialogProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  fileName: string
}

export function OcrPremiumDialog({ isOpen, onClose, onProceed, fileName }: OcrPremiumDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
      >
        {/* Header with Icon */}
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
            <span className="text-2xl">🔒</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Premium Feature Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              OCR Processing Needed
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-gray-100">{fileName}</strong> appears to be a scanned document and requires <strong>OCR (Optical Character Recognition)</strong> for text extraction.
          </p>
          
          {/* Premium Features Box */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2 flex items-center gap-2">
              <span>✨</span> OCR Processing is a Premium Feature
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              Upgrade to Premium to unlock:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>OCR text extraction from scanned PDFs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Unlimited file uploads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Advanced AI features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Priority processing</span>
              </li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <strong>Note:</strong> You can still upload this file, but text extraction will be limited. For best results, consider upgrading to Premium.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel Upload
          </button>
          <button
            onClick={onProceed}
            className="px-5 py-2.5 rounded-lg transition-all font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
