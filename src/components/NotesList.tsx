
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@supabase/auth-helpers-react'
import { useCallback, useEffect, useState } from 'react'

type Note = {
  id: string
  title: string
  created_at: string
  file_size: number
}
export default function NotesList() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const user = useUser()

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, created_at, file_size')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notes:', error)
        setNotes([])
        return
      }

      setNotes(data ?? [])
    } catch (err) {
      console.error('Unexpected error fetching notes:', err)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    void fetchNotes()
  }, [fetchNotes])

  const downloadPDF = async (note: Note) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Download from storage
      const { data, error } = await supabase.storage
        .from('notes-pdfs')
        .download(`${user.id}/${note.id}.pdf`)

      if (error) {
        alert('Failed to download file')
        return
      }

      if (data) {
        // Create download link
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${note.title}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file')
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete from storage
      await supabase.storage
        .from('notes-pdfs')
        .remove([`${user.id}/${noteId}.pdf`])

      // Delete from database
      await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      // Refresh list
      await fetchNotes()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete note')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading notes...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Notes</h2>
      
      {notes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No notes yet. Upload your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
            >
              <div className="flex-1">
                <h3 className="font-medium text-lg">{note.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(note.created_at).toLocaleDateString()} • 
                  {' '}{(note.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadPDF(note)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}