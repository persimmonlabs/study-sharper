'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  title: string
  date: string
  duration: number
  subject: string
}

export default function Calendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      if (typeof window !== 'undefined') {
        const testMode = localStorage.getItem('testMode')
        const testUser = localStorage.getItem('testUser')

        if (testMode === 'true' && testUser) {
          console.log('Test mode detected, using mock calendar data')
          setMockData()
          setLoading(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      await fetchCalendarData()
    }

    checkUser()
  }, [router])

  const setMockData = () => {
    const mockAssignments: Assignment[] = [
      {
        id: '1',
        title: 'Math Homework Chapter 5',
        description: 'Complete exercises 1-20',
        due_date: '2024-01-15',
        status: 'pending',
        priority: 'high',
        subject: 'Mathematics'
      },
      {
        id: '2',
        title: 'History Essay',
        description: 'Write 1000 words on World War II',
        due_date: '2024-01-18',
        status: 'in_progress',
        priority: 'medium',
        subject: 'History'
      }
    ]

    const mockSessions: StudySession[] = [
      {
        id: '1',
        title: 'Math Study Session',
        date: '2024-01-14',
        duration: 90,
        subject: 'Mathematics'
      }
    ]

    setAssignments(mockAssignments)
    setStudySessions(mockSessions)
  }

  const fetchCalendarData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })

      // Fetch study sessions
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setAssignments(assignmentsData || [])
      setStudySessions(sessionsData || [])
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
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
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayAssignments = assignments.filter(a => a.due_date === dateStr)
    const daySessions = studySessions.filter(s => s.date === dateStr)
    return { assignments: dayAssignments, sessions: daySessions }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Calendar & Assignments</h1>
          <p className="text-gray-600 mt-2">Manage your assignments, deadlines, and study schedule</p>
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
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
                  isToday ? 'bg-primary-50 border-primary-200' : 
                  isSelected ? 'bg-blue-50 border-blue-200' : 
                  'hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-primary-700' : 'text-gray-900'}`}>
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
                      className="text-xs px-1 py-0.5 rounded truncate bg-blue-100 text-blue-800"
                    >
                      Study: {session.subject}
                    </div>
                  ))}
                  {(events.assignments.length + events.sessions.length) > 3 && (
                    <div className="text-xs text-gray-500">
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
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
          <div className="space-y-4">
            {assignments.slice(0, 5).map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-primary-600 hover:text-primary-700 text-sm">
                    Edit
                  </button>
                  <button className="text-green-600 hover:text-green-700 text-sm">
                    Complete
                  </button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No assignments yet</p>
                <Link href="/calendar/new-assignment" className="text-primary-600 hover:text-primary-700 text-sm">
                  Add your first assignment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Study Goals & Time Blocking */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Goals & Schedule</h3>
          
          {/* Daily Goal Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Study Goal</span>
              <span className="text-sm text-gray-500">2h / 4h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>

          {/* Weekly Goal Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Weekly Study Goal</span>
              <span className="text-sm text-gray-500">12h / 20h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>

          {/* Time Blocks */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Today's Schedule</h4>
            <div className="space-y-2">
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Math Study Session</div>
                  <div className="text-xs text-gray-600">2:00 PM - 3:30 PM</div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">History Reading</div>
                  <div className="text-xs text-gray-600">4:00 PM - 5:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-2 gap-3">
              <button className="px-3 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors">
                Set Goals
              </button>
              <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Time Block
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
