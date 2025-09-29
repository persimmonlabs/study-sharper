'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/lib/supabase'

type Note = Database['public']['Tables']['notes']['Row']

interface NotePageProps {
  params: {
    id: string
  }
}

export default function NotePage({ params }: NotePageProps) {
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (error) {
          setError('Note not found')
        } else {
          setNote(data)
        }
      } catch (error) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchNote()
  }, [params.id, router])

  const generateSummary = async () => {
    if (!note) return

    setLoading(true)
    try {
      // This would integrate with OpenAI API in a real implementation
      // For now, we'll create a simple summary
      const summary = note.content.length > 200
        ? note.content.substring(0, 200) + '...'
        : note.content

      const { error } = await supabase
        .from('notes')
        .update({ summary })
        .eq('id', note.id)

      if (error) {
        setError('Failed to generate summary')
      } else {
        setNote({ ...note, summary })
        setError('')
      }
    } catch (error) {
      setError('Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading note...</div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Note not found</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          href="/notes"
          className="text-primary-600 hover:text-primary-700"
        >
          ← Back to Notes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/notes"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Notes
          </Link>
          <div className="flex space-x-2">
            <Link
              href={`/notes/${note.id}/edit`}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Edit Note
            </Link>
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
            <p className="text-gray-600 mt-2">
              Created {new Date(note.created_at).toLocaleDateString()} •
              Updated {new Date(note.updated_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={generateSummary}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>

        {note.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {note.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">AI Summary</h2>
          <p className="text-blue-800">{note.summary}</p>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {note.content}
          </pre>
        </div>
      </div>
    </div>
  )
}
