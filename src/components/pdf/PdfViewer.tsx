import { useEffect, useState } from 'react'

interface PdfViewerProps {
  src: string | null
  title?: string
}

export function PdfViewer({ src, title }: PdfViewerProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [src])

  if (!src) {
    return (
      <div className="h-96 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          No preview available for this file.
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[60vh] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-8">
      <iframe
        src={`${src}#toolbar=0&navpanes=0&scrollbar=1`}
        title={title ?? 'PDF Preview'}
        className="w-full h-full"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading preview…</div>
        </div>
      )}
    </div>
  )
}
