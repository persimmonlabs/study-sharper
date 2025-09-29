'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/lib/supabase'
import { format, isAfter, isBefore, addDays } from 'date-fns'

type Assignment = Database['public']['Tables']['assignments']['Row']

interface AssignmentPageProps {
  params: {
    id: string
  }
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studySessions, setStudySessions] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (error) {
          setError('Assignment not found')
        } else {
          setAssignment(data)

          // Fetch related study sessions
          const { data: sessions } = await supabase
            .from('study_sessions')
            .select('*')
            .eq('assignment_id', data.id)
            .order('created_at', { ascending: false })

          setStudySessions(sessions || [])
        }
      } catch (error) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAssignment()
  }, [params.id, router])

  const handleStatusChange = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!assignment) return

    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', assignment.id)

      if (error) {
        setError('Failed to update status')
      } else {
        setAssignment({ ...assignment, status: newStatus })
        setError('')
      }
    } catch (error) {
      setError('Failed to update status')
    }
  }

  const logStudySession = async (duration: number) => {
    if (!assignment) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('study_sessions')
        .insert([{
          user_id: user.id,
          assignment_id: assignment.id,
          duration_minutes: duration,
          quality_rating: null,
          notes: null,
        }])

      if (error) {
        console.error('Error logging study session:', error)
      } else {
        // Refresh study sessions
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('assignment_id', assignment.id)
          .order('created_at', { ascending: false })

        setStudySessions(sessions || [])
      }
    } catch (error) {
      console.error('Error logging study session:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading assignment...</div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment not found</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          href="/assignments"
          className="text-primary-600 hover:text-primary-700"
        >
          ← Back to Assignments
        </Link>
      </div>
    )
  }

  const dueDate = new Date(assignment.due_date)
  const now = new Date()
  const isOverdue = isBefore(dueDate, now) && assignment.status !== 'completed'
  const isDueSoon = isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 2))
  const totalStudyTime = studySessions.reduce((total, session) => total + session.duration_minutes, 0)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/assignments"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Assignments
          </Link>
          <div className="flex space-x-2">
            <Link
              href={`/assignments/${assignment.id}/edit`}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Edit Assignment
            </Link>
          </div>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
            <p className="text-gray-600 mt-2">
              Created {format(new Date(assignment.created_at), 'MMM d, yyyy')} •
              Updated {format(new Date(assignment.updated_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getPriorityColor(assignment.priority)}`}>
            {assignment.priority} priority
          </span>
          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(assignment.status)}`}>
            {assignment.status.replace('_', ' ')}
          </span>
          <span className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
            {assignment.type}
          </span>
          {isOverdue && (
            <span className="inline-block px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
              Overdue
            </span>
          )}
          {isDueSoon && !isOverdue && (
            <span className="inline-block px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">
              Due Soon
            </span>
          )}
        </div>

        <div className={`p-4 rounded-lg border-2 ${
          isOverdue
            ? 'bg-red-50 border-red-200'
            : isDueSoon
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Due Date</h3>
              <p className={`text-2xl font-bold ${
                isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {format(dueDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className={`text-sm ${
                isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {format(dueDate, 'h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Days remaining</div>
              <div className={`text-2xl font-bold ${
                isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {isOverdue
                  ? `${Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue`
                  : `${Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {assignment.description && (
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Study Progress</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Study Time</span>
              <span className="font-semibold">{Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Study Sessions</span>
              <span className="font-semibold">{studySessions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <select
                value={assignment.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Quick Study Log</h3>
            <div className="flex space-x-2">
              {[15, 30, 60, 120].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => logStudySession(minutes)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Study Sessions</h2>
          {studySessions.length === 0 ? (
            <p className="text-gray-600">No study sessions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {studySessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {session.duration_minutes} minutes
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(session.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {session.quality_rating && (
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${
                            star <= session.quality_rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
