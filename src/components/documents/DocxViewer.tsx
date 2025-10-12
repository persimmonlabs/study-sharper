'use client'

import { useEffect, useState } from 'react'

/**
 * Props for the DocxViewer component
 */
interface DocxViewerProps {
  /** URL or signed URL to the DOCX file */
  src: string
  /** Title of the document (used for accessibility) */
  title: string
}

/**
 * DocxViewer Component
 * 
 * Renders Microsoft Word (.docx) files as HTML using the mammoth library.
 * Displays loading spinner while converting and shows error messages on failure.
 * 
 * @param props - Component props
 * @returns A rendered HTML view of the DOCX document
 */
export function DocxViewer({ src, title }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDocx = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch the DOCX file
        const response = await fetch(src)
        if (!response.ok) {
          throw new Error('Failed to fetch DOCX file')
        }

        const arrayBuffer = await response.arrayBuffer()

        // Import mammoth dynamically
        const mammoth = await import('mammoth')
        const input = { arrayBuffer } as Parameters<typeof mammoth.convertToHtml>[0]
        const result = await mammoth.convertToHtml(input)

        if (!isMounted) return

        if (result.value) {
          setHtmlContent(result.value)
        } else {
          setError('Unable to render DOCX content')
        }
      } catch (err) {
        if (!isMounted) return
        console.error('DOCX rendering error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load DOCX file')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDocx()

    return () => {
      isMounted = false
    }
  }, [src])

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading document...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <div 
        className="prose prose-gray dark:prose-invert max-w-none p-6 overflow-y-auto"
        style={{ maxHeight: '600px' }}
        dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
      />
    </div>
  )
}
