'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { NoteModal } from '@/components/NoteModal'

interface DashboardStats {
  totalNotes: number
  totalAssignments: number
  upcomingAssignments: number
  totalStudyTime: number
  quizzesCompleted: number
  streakDays: number
  tokens: number
  xp: number
  level: number
}

interface UserProfile {
  first_name: string | null
  last_name: string | null
}

interface ActivityItem {
  id: string
  type: 'token_earned' | 'achievement' | 'quiz_completed' | 'study_session' | 'note'
  title: string
  description: string
  tokens?: number
  timestamp: string
  icon: string
}

interface Friend {
  id: string
  name: string
  avatar: string
  tokens: number
  level: number
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  type: 'study_topic' | 'quiz' | 'review'
  subject: string
  priority: 'high' | 'medium' | 'low'
}

interface AssignmentSummary {
  id: string
  title: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | null
  status: 'pending' | 'in_progress' | 'completed' | null
  description?: string | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalNotes: 0,
    totalAssignments: 0,
    upcomingAssignments: 0,
    totalStudyTime: 0,
    quizzesCompleted: 0,
    streakDays: 0,
    tokens: 0,
    xp: 0,
    level: 1,
  })
  const [userProfile, setUserProfile] = useState<UserProfile>({
    first_name: null,
    last_name: null,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [topFriends, setTopFriends] = useState<Friend[]>([])
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
  const [upcomingAssignmentsList, setUpcomingAssignmentsList] = useState<AssignmentSummary[]>([])
  const [modalNote, setModalNote] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dailyGoalProgress, setDailyGoalProgress] = useState({ current: 0, target: 240 }) // minutes
  const [weeklyGoalProgress, setWeeklyGoalProgress] = useState({ current: 0, target: 1200 }) // minutes
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading, signOut } = useAuth()

  const redirectToLogin = useCallback(() => {
    if (!user && !authLoading) {
      const nextParam = pathname && pathname !== '/dashboard' ? `?next=${encodeURIComponent(pathname)}` : ''
      router.push(`/auth/login${nextParam}`)
    }
  }, [authLoading, pathname, router, user])

  useEffect(() => {
    redirectToLogin()
  }, [redirectToLogin])

  useEffect(() => {
    if (!user) {
      return
    }

    const loadDashboard = async () => {
      try {
        const [profileLoaded] = await Promise.all([
          fetchUserProfile(user),
          fetchStats(user),
        ])

        if (!profileLoaded) {
          await createFallbackProfile(user)
          await fetchUserProfile(user)
        }

        await loadRecentActivity(user)
        await loadSocialData(user)
      } catch (loadError) {
        console.error('Error loading dashboard data:', loadError)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [user])

  const fetchUserProfile = useCallback(async (currentUser: User) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUser.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        return true
      }
      return false
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Set default values if profile fetch fails
      setUserProfile({ first_name: 'User', last_name: null })
      return false
    }
  }, [])

  const fetchStats = useCallback(async (currentUser: User) => {
    try {
      const now = new Date()
      const nowIso = now.toISOString()

      // Get notes count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)

      // Get assignments count
      const { count: assignmentsCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)

      // Get upcoming assignments (due in next 7 days)
      const sevenDaysFromNow = new Date(now)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const { count: upcomingCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .lt('due_date', sevenDaysFromNow.toISOString())
        .gte('due_date', nowIso)

      const { data: upcomingAssignmentsData, error: upcomingAssignmentsError } = await supabase
        .from('assignments')
        .select('id, title, due_date, priority, status, description')
        .eq('user_id', currentUser.id)
        .lt('due_date', sevenDaysFromNow.toISOString())
        .gte('due_date', nowIso)
        .order('due_date', { ascending: true })
        .limit(5)

      if (upcomingAssignmentsError) {
        throw upcomingAssignmentsError
      }

      // Get total study time
      const { data: studySessions } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', currentUser.id)

      const totalStudyTime = studySessions?.reduce(
        (total, session) => total + session.duration_minutes,
        0
      ) || 0

      setUpcomingAssignmentsList(upcomingAssignmentsData ?? [])

      setStats({
        totalNotes: notesCount || 0,
        totalAssignments: assignmentsCount || 0,
        upcomingAssignments: upcomingCount || 0,
        totalStudyTime,
        quizzesCompleted: 0,
        streakDays: 0,
        tokens: 0,
        xp: 0,
        level: 1,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default values if stats fetch fails
      setStats({
        totalNotes: 0,
        totalAssignments: 0,
        upcomingAssignments: 0,
        totalStudyTime: 0,
        quizzesCompleted: 0,
        streakDays: 0,
        tokens: 0,
        xp: 0,
        level: 1,
      })
      setUpcomingAssignmentsList([])
    }
  }, [])

  const loadRecentActivity = useCallback(async (currentUser: User) => {
    try {
      // Get recent notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title, content, created_at, updated_at')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(3)

      // Get recent study sessions
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('id, created_at, notes')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(2)

      const activityItems: ActivityItem[] = []

      // Add notes to activity
      if (notesData) {
        notesData.forEach((note) => {
          activityItems.push({
            id: note.id,
            type: 'note',
            title: note.title,
            description: note.content?.substring(0, 100) + (note.content && note.content.length > 100 ? '...' : '') || 'Note created',
            timestamp: note.updated_at,
            icon: '📝',
          })
        })
      }

      // Add study sessions to activity
      if (sessionsData) {
        sessionsData.forEach((session) => {
          activityItems.push({
            id: session.id,
            type: 'study_session',
            title: 'Study Session Logged',
            description: session.notes || 'Great work continuing your streak!',
            timestamp: session.created_at,
            icon: '📚',
          })
        })
      }

      // Sort by timestamp and take top 5
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activityItems.slice(0, 5))
    } catch (error) {
      console.error('Error loading recent activity:', error)
      setRecentActivity([])
    }
  }, [])

  const loadSocialData = useCallback(async (_currentUser: User) => {
    try {
      // Placeholder for future social data.
      setTopFriends([])
      setAIRecommendations([])
    } catch (error) {
      console.error('Error loading social data:', error)
      setTopFriends([])
      setAIRecommendations([])
    }
  }, [])

  const createFallbackProfile = useCallback(async (currentUser: User) => {
    try {
      await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          first_name: currentUser.user_metadata?.first_name ?? null,
          last_name: currentUser.user_metadata?.last_name ?? null,
        })
    } catch (error) {
      console.error('Error creating fallback profile:', error)
    }
  }, [])

  const handleViewNote = async (noteId: string) => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        throw error
      }

      setModalNote(data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error fetching note:', error)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalNote(null)
  }

  const handleNoteDeleted = () => {
    // Close modal
    setIsModalOpen(false)
    setModalNote(null)
    
    // Refresh dashboard data
    if (user) {
      loadRecentActivity(user)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const firstName = userProfile.first_name || 'there'
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with Level & Tokens */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {firstName}! 🎓
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Ready to continue your learning journey?</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-2 rounded-lg text-sm h-10 flex items-center">
            <div className="text-center whitespace-nowrap">
              <span className="text-sm font-bold">Level {stats.level}</span>
              <span className="text-xs opacity-90 ml-1">{stats.xp} XP</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-2 rounded-lg text-sm h-10 flex items-center">
            <div className="text-center whitespace-nowrap">
              <span className="text-sm font-bold">{stats.tokens}</span>
              <span className="text-xs opacity-90 ml-1">Tokens</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors h-10 flex items-center justify-center whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Study Streak & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Streak */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Study Streak 🔥</h3>
              <div className="text-3xl font-bold">{stats.streakDays}</div>
              <div className="text-orange-100">days in a row</div>
            </div>
            <div className="text-5xl opacity-80">🔥</div>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Goal</h3>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Study Time</span>
            <span>{dailyGoalProgress.current}m / {dailyGoalProgress.target}m</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((dailyGoalProgress.current / dailyGoalProgress.target) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {Math.round((dailyGoalProgress.current / dailyGoalProgress.target) * 100)}% complete
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Goal</h3>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Study Time</span>
            <span>{Math.floor(weeklyGoalProgress.current / 60)}h {weeklyGoalProgress.current % 60}m / {Math.floor(weeklyGoalProgress.target / 60)}h</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((weeklyGoalProgress.current / weeklyGoalProgress.target) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {Math.round((weeklyGoalProgress.current / weeklyGoalProgress.target) * 100)}% complete
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">📚</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalNotes}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Notes</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">📝</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalAssignments}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Assignments</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">🧠</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.quizzesCompleted}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Quizzes</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.floor(stats.totalStudyTime / 60)}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Study Time</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.xp}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">XP</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl mb-2">⏰</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.upcomingAssignments}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Due Soon</div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Activity & AI Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No recent activity</p>
                  <Link href="/notes" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 inline-block">
                    Create your first note
                  </Link>
                </div>
              ) : (
                recentActivity.map(activity => (
                  <div 
                    key={activity.id} 
                    className={`flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                      activity.type === 'note' ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors' : ''
                    }`}
                    onClick={() => activity.type === 'note' ? handleViewNote(activity.id) : undefined}
                  >
                    <div className="text-2xl mr-4">{activity.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{activity.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {activity.tokens && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded text-sm font-medium">
                        +{activity.tokens} tokens
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Study Recommendations</h3>
              <div className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                AI
              </div>
            </div>
            <div className="space-y-4">
              {aiRecommendations.map(rec => (
                <div key={rec.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{rec.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                          {rec.subject}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} priority
                        </span>
                      </div>
                    </div>
                    <button className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors">
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Friends & Quick Actions */}
        <div className="space-y-6">
          {/* Mini Leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Friends 🏆</h3>
            <div className="space-y-3">
              {topFriends.map((friend, index) => (
                <div key={friend.id} className="flex items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="text-xl mr-3">{friend.avatar}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{friend.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Level {friend.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{friend.tokens}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">tokens</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/social" className="block text-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-4">
              View All Friends →
            </Link>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {upcomingAssignmentsList.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-10 w-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No upcoming assignments scheduled</p>
                  <Link href="/calendar/new-assignment" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 inline-block">
                    Add your first assignment
                  </Link>
                </div>
              ) : (
                upcomingAssignmentsList.map((assignment) => {
                  const dueDateLabel = assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'
                  return (
                    <div key={assignment.id} className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{assignment.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due: {dueDateLabel}</p>
                        {assignment.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{assignment.description}</p>
                        )}
                        <div className="flex items-center mt-2 space-x-2">
                          {assignment.priority && (
                            <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getPriorityColor(assignment.priority)}`}>
                              {assignment.priority} priority
                            </span>
                          )}
                          {assignment.status && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                              {assignment.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href="/calendar" className="ml-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
                        View
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/study" className="bg-primary-600 text-white p-3 rounded-lg text-center hover:bg-primary-700 transition-colors">
                <div className="text-lg mb-1">📚</div>
                <div className="text-sm font-medium">Start Studying</div>
              </Link>
              <Link href="/notes" className="bg-green-600 text-white p-3 rounded-lg text-center hover:bg-green-700 transition-colors">
                <div className="text-lg mb-1">📝</div>
                <div className="text-sm font-medium">Upload Notes</div>
              </Link>
              <Link href="/study?mode=quiz" className="bg-purple-600 text-white p-3 rounded-lg text-center hover:bg-purple-700 transition-colors">
                <div className="text-lg mb-1">🧠</div>
                <div className="text-sm font-medium">Take Quiz</div>
              </Link>
              <Link href="/social" className="bg-blue-600 text-white p-3 rounded-lg text-center hover:bg-blue-700 transition-colors">
                <div className="text-lg mb-1">👥</div>
                <div className="text-sm font-medium">Find Friends</div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <NoteModal 
        note={modalNote}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDeleted={handleNoteDeleted}
      />
    </div>
  )
}
