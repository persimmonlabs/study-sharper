'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NotesUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Success!
      setSuccess(true)
      // Clear the form
      e.currentTarget.reset()
      // Refresh the page to show the new note
      setTimeout(() => {
        router.refresh()
      }, 1000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Notes</h2>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Note Title (optional)
          </label>
          <input
            type="text"
            name="title"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave blank to use filename"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Upload PDF
          </label>
          <input
            type="file"
            name="file"
            accept=".pdf"
            required
            className="w-full text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            Note uploaded successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? 'Uploading...' : 'Upload Note'}
        </button>
      </form>
    </div>
  )
}