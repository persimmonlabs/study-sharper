'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import type { User } from '@supabase/supabase-js'

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  subject: string
}

interface StudySession {
  id: string
  date: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string | null
}

export default function Calendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const fetchCalendarData = useCallback(async (currentUser: User) => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('due_date', { ascending: true })

      if (assignmentsError) {
        throw assignmentsError
      }

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('id, duration_minutes, notes, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        throw sessionsError
      }

      setAssignments(assignmentsData || [])
      const normalizedSessions: StudySession[] = (sessionsData || []).map((session: any) => {
        const createdAt: string | null = session.created_at ?? null
        const derivedDate = createdAt ? new Date(createdAt).toISOString().split('T')[0] : null

        return {
          id: session.id,
          date: derivedDate,
          duration_minutes: session.duration_minutes ?? null,
          notes: session.notes ?? null,
          created_at: createdAt,
        }
      })

      setStudySessions(normalizedSessions)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
      setAssignments([])
      setStudySessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setLoading(false)
      const nextParam = encodeURIComponent('/calendar')
      router.push(`/auth/login?next=${nextParam}`)
      return
    }

    setLoading(true)
    fetchCalendarData(user)
  }, [authLoading, fetchCalendarData, router, user])

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { assignments: Assignment[]; sessions: StudySession[] }>()

    assignments.forEach((assignment) => {
      const key = assignment.due_date
      const existing = map.get(key) ?? { assignments: [], sessions: [] }
      existing.assignments.push(assignment)
      map.set(key, existing)
    })

    studySessions.forEach((session) => {
      if (!session.date) return
      const key = session.date
      const existing = map.get(key) ?? { assignments: [], sessions: [] }
      existing.sessions.push(session)
      map.set(key, existing)
    })

    return map
  }, [assignments, studySessions])

  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const events = eventsByDay.get(dateStr) ?? { assignments: [], sessions: [] }
    return events
  }, [eventsByDay])

  const dailyTarget = 240
  const weeklyTarget = 1200

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])

  const todaysMinutes = useMemo(() => {
    return studySessions.reduce((total, session) => {
      const sessionDate = session.date ?? (session.created_at ? new Date(session.created_at).toISOString().split('T')[0] : null)
      if (sessionDate === todayIso) {
        return total + (session.duration_minutes ?? 0)
      }
      return total
    }, 0)
  }, [studySessions, todayIso])

  const weeklyMinutes = useMemo(() => {
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    return studySessions.reduce((total, session) => {
      const sessionDateStr = session.date ?? (session.created_at ? new Date(session.created_at).toISOString().split('T')[0] : null)
      if (!sessionDateStr) return total

      const sessionDate = new Date(`${sessionDateStr}T00:00:00`)
      if (sessionDate >= startOfWeek) {
        return total + (session.duration_minutes ?? 0)
      }
      return total
    }, 0)
  }, [studySessions])

  const todaysSessions = useMemo(() => {
    return studySessions.filter((session) => {
      const sessionDate = session.date ?? (session.created_at ? new Date(session.created_at).toISOString().split('T')[0] : null)
      return sessionDate === todayIso
    })
  }, [studySessions, todayIso])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading calendar...</div>
      </div>
    )
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar & Assignments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your assignments, deadlines, and study schedule</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Schedule Study Session
          </button>
          <Link
            href="/calendar/new-assignment"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Add Assignment
          </Link>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24 p-1"></div>
            }

            const events = getEventsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`h-24 p-1 border rounded-lg cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' : 
                  isSelected ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 
                  'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1 mt-1">
                  {events.assignments.slice(0, 2).map(assignment => (
                    <div
                      key={assignment.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${getPriorityColor(assignment.priority)}`}
                    >
                      {assignment.title}
                    </div>
                  ))}
                  {events.sessions.slice(0, 1).map(session => (
                    <div
                      key={session.id}
                      className="text-xs px-1 py-0.5 rounded truncate bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                    >
                      Study session
                    </div>
                  ))}
                  {(events.assignments.length + events.sessions.length) > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{(events.assignments.length + events.sessions.length) - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upcoming Assignments</h3>
          <div className="space-y-4">
            {assignments.slice(0, 5).map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assignment.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm">
                    Edit
                  </button>
                  <button className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm">
                    Complete
                  </button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No assignments yet</p>
                <Link href="/calendar/new-assignment" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm">
                  Add your first assignment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Study Goals & Today's Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Study Goals & Schedule</h3>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Study Goal</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.floor(todaysMinutes / 60)}h {todaysMinutes % 60}m / {Math.floor(dailyTarget / 60)}h {dailyTarget % 60}m
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((todaysMinutes / dailyTarget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Weekly Study Goal</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m / {Math.floor(weeklyTarget / 60)}h {weeklyTarget % 60}m
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((weeklyMinutes / weeklyTarget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Today's Schedule</h4>
            {todaysSessions.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                No study sessions logged today yet. Schedule or log one to see it here.
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session) => {
                  const duration = session.duration_minutes ?? 0
                  const durationLabel = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : 'Duration not recorded'
                  const notesPreview = session.notes ? session.notes : 'Study session'

                  return (
                    <div key={session.id} className="flex items-start p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
                      <div className="w-2 h-2 bg-primary-600 rounded-full mr-3 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{notesPreview}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{durationLabel}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
