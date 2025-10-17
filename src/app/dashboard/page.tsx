'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { NoteModal } from '@/components/notes/NoteModal'
import { NoteContextMenu } from '@/components/notes/NoteContextMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WelcomeBanner, QuickActionCard, ProgressRing, StreakTracker, StatCard } from '@/components/dashboard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

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
  console.log('[Dashboard] Component mounting/rendering')
  
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; noteId: string | null; noteTitle: string }>({ isOpen: false, noteId: null, noteTitle: '' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [dailyGoalProgress, setDailyGoalProgress] = useState({ current: 0, target: 240 }) // minutes
  const [weeklyGoalProgress, setWeeklyGoalProgress] = useState({ current: 0, target: 1200 }) // minutes
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  
  // Error states for each section
  const [profileError, setProfileError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [socialError, setSocialError] = useState<string | null>(null)
  
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  // Simple auth redirect - only redirect when auth is done loading and no user
  // Add a fallback: if authLoading never resolves within 2s, check session directly
  useEffect(() => {
    let timeout: any

    const directCheck = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        console.log('[Dashboard] Fallback session check:', { hasSession: !!data.session, userId: data.session?.user?.id })
        if (data.session && !user) {
          // Soft refresh to let AuthProvider pick it up
          router.refresh()
        }
      } catch (err) {
        console.warn('[Dashboard] Fallback getSession error:', err)
      }
    }

    if (!authLoading && !user) {
      console.log('[Dashboard] No user after auth loaded, redirecting to login')
      router.push('/auth/login?next=/dashboard')
    } else if (authLoading) {
      timeout = setTimeout(() => {
        console.warn('[Dashboard] authLoading still true after 2000ms, running fallback session check')
        directCheck()
      }, 2000)
    }

    return () => clearTimeout(timeout)
  }, [authLoading, user, router])

  const fetchUserProfile = useCallback(async (currentUser: User) => {
    setProfileError(null)
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error) {
        throw error
      }

      if (profile) {
        setUserProfile({
          first_name: profile.first_name,
          last_name: profile.last_name,
        })
        
        // Check if this is first login (created within last 5 minutes)
        const createdAt = new Date(profile.created_at)
        const now = new Date()
        const timeDiff = now.getTime() - createdAt.getTime()
        const minutesDiff = timeDiff / (1000 * 60)
        
        if (minutesDiff < 5) {
          setIsFirstLogin(true)
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('Error fetching user profile:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to load profile'
      setProfileError(errorMsg)
      // Set default values if profile fetch fails
      setUserProfile({ first_name: 'User', last_name: null })
      return false
    }
  }, [])

  const fetchStats = useCallback(async (currentUser: User) => {
    setStatsError(null)
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
      const errorMsg = error instanceof Error ? error.message : 'Failed to load statistics'
      setStatsError(errorMsg)
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
    setActivityError(null)
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
      const errorMsg = error instanceof Error ? error.message : 'Failed to load recent activity'
      setActivityError(errorMsg)
      setRecentActivity([])
    }
  }, [])

  const loadSocialData = useCallback(async (_currentUser: User) => {
    setSocialError(null)
    try {
      // Placeholder for future social data.
      setTopFriends([])
      setAIRecommendations([])
    } catch (error) {
      console.error('Error loading social data:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to load recommendations'
      setSocialError(errorMsg)
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

  useEffect(() => {
    if (authLoading) {
      return // Wait for auth to finish
    }
    
    if (!user) {
      setLoading(false) // Not logged in, stop loading
      return
    }

    // AbortController for cleanup - cancels requests on unmount
    const abortController = new AbortController()
    let isMounted = true

    const loadDashboard = async () => {
      console.log('[Dashboard] Loading dashboard data for user:', user.id)
      setLoading(true)
      
      try {
        // Load all data in parallel - no timeout, let each section handle its own errors
        // This allows progressive loading - sections appear as they complete
        await Promise.allSettled([
          fetchUserProfile(user),
          fetchStats(user),
          loadRecentActivity(user),
          loadSocialData(user),
        ])
        
        if (!isMounted) {
          console.log('[Dashboard] Component unmounted, skipping state updates')
          return
        }
        
        console.log('[Dashboard] Dashboard data loaded')
      } catch (error) {
        if (!isMounted) return
        console.error('[Dashboard] Unexpected error:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    // Cleanup function - prevents state updates after unmount
    return () => {
      console.log('[Dashboard] Cleaning up - aborting pending requests')
      isMounted = false
      abortController.abort()
    }
  }, [user, authLoading, fetchUserProfile, fetchStats, loadRecentActivity, loadSocialData])

  const handleViewNote = useCallback(async (noteId: string) => {
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
  }, [user])

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
      fetchStats(user)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, noteId })
  }

  const handleDeleteClick = (noteId: string) => {
    const activity = recentActivity.find(a => a.id === noteId && a.type === 'note')
    if (activity) {
      setDeleteConfirm({ isOpen: true, noteId, noteTitle: activity.title })
      setContextMenu(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.noteId || !user) return

    setIsDeleting(true)
    try {
      // Get note details to find file_path
      const { data: note } = await supabase
        .from('notes')
        .select('file_path')
        .eq('id', deleteConfirm.noteId)
        .eq('user_id', user.id)
        .single()

      // Delete from storage if file exists
      if (note?.file_path) {
        await supabase.storage
          .from('notes-pdfs')
          .remove([note.file_path])
      }

      // Delete from database
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deleteConfirm.noteId)
        .eq('user_id', user.id)

      if (error) throw error

      // Close modal if deleted note was open
      if (modalNote?.id === deleteConfirm.noteId) {
        setIsModalOpen(false)
        setModalNote(null)
      }

      // Refresh dashboard data
      await loadRecentActivity(user)
      await fetchStats(user)

      setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: '' })
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete note. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  // Retry functions for error recovery
  const retryProfile = useCallback(async () => {
    if (!user) return
    await fetchUserProfile(user)
  }, [user, fetchUserProfile])

  const retryStats = useCallback(async () => {
    if (!user) return
    await fetchStats(user)
  }, [user, fetchStats])

  const retryActivity = useCallback(async () => {
    if (!user) return
    await loadRecentActivity(user)
  }, [user, loadRecentActivity])

  const retrySocial = useCallback(async () => {
    if (!user) return
    await loadSocialData(user)
  }, [user, loadSocialData])

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    )
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
    <div className="space-y-6">
      {/* Error Banners */}
      {profileError && (
        <ErrorBanner
          title="Profile Error"
          message={profileError}
          onRetry={retryProfile}
          variant="warning"
        />
      )}
      {statsError && (
        <ErrorBanner
          title="Statistics Error"
          message={statsError}
          onRetry={retryStats}
          variant="warning"
        />
      )}
      {activityError && (
        <ErrorBanner
          title="Activity Error"
          message={activityError}
          onRetry={retryActivity}
          variant="info"
        />
      )}
      {socialError && (
        <ErrorBanner
          title="Recommendations Error"
          message={socialError}
          onRetry={retrySocial}
          variant="info"
        />
      )}
      
      {/* Welcome Banner */}
      <WelcomeBanner 
        firstName={firstName}
        isFirstLogin={isFirstLogin}
        level={stats.level}
        xp={stats.xp}
        tokens={stats.tokens}
      />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard 
          title="Start Studying"
          description="Begin a study session"
          icon="📚"
          href="/study"
          color="blue"
        />
        <QuickActionCard 
          title="Upload Notes"
          description="Add new study materials"
          icon="📝"
          href="/notes"
          color="green"
        />
        <QuickActionCard 
          title="Take a Quiz"
          description="Test your knowledge"
          icon="🧠"
          href="/study?mode=quiz"
          color="purple"
        />
        <QuickActionCard 
          title="Find Friends"
          description="Connect with peers"
          icon="👥"
          href="/social"
          color="orange"
        />
      </div>

      {/* Streak & Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak Tracker */}
        <StreakTracker streakDays={stats.streakDays} />
        
        {/* Progress Rings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Daily Goal</h3>
          <div className="flex justify-center">
            <ProgressRing 
              current={dailyGoalProgress.current}
              target={dailyGoalProgress.target}
              label="Minutes Today"
              color="green"
              size="medium"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Weekly Goal</h3>
          <div className="flex justify-center">
            <ProgressRing 
              current={weeklyGoalProgress.current}
              target={weeklyGoalProgress.target}
              label="Minutes This Week"
              color="blue"
              size="medium"
            />
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon="📚" value={stats.totalNotes} label="Notes" color="primary" />
        <StatCard icon="📝" value={stats.totalAssignments} label="Assignments" color="green" />
        <StatCard icon="🧠" value={stats.quizzesCompleted} label="Quizzes" color="purple" />
        <StatCard icon="⏱️" value={`${Math.floor(stats.totalStudyTime / 60)}h`} label="Study Time" color="orange" />
        <StatCard icon="⚡" value={stats.xp} label="XP" color="yellow" />
        <StatCard icon="⏰" value={stats.upcomingAssignments} label="Due Soon" color="red" />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity & AI Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
              <Link href="/notes" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No recent notes</p>
                  <Link href="/notes" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 inline-block">
                    Create your first note
                  </Link>
                </div>
              ) : (
                recentActivity.map(activity => (
                  <div 
                    key={activity.id} 
                    className={`flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-200 ${
                      activity.type === 'note' ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md hover:-translate-y-0.5' : ''
                    }`}
                    onClick={() => activity.type === 'note' ? handleViewNote(activity.id) : undefined}
                    onContextMenu={(e) => activity.type === 'note' ? handleContextMenu(e, activity.id) : undefined}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white dark:bg-gray-600 shadow-sm mr-4">
                      <span className="text-2xl">{activity.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{activity.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{activity.description}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {activity.tokens && (
                      <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                        +{activity.tokens} 🪙
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg mr-3">
                  🤖
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Recommendations</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personalized for you</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {aiRecommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <p className="text-sm mb-2">AI recommendations coming soon!</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Keep studying to unlock personalized tips</p>
                </div>
              ) : (
                aiRecommendations.map(rec => (
                  <div key={rec.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{rec.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 text-xs px-2 py-1 rounded font-medium">
                            {rec.subject}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.priority}
                          </span>
                        </div>
                      </div>
                      <button className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-sm ml-3 flex-shrink-0">
                        Start
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Friends & Deadlines */}
        <div className="space-y-6">
          {/* Mini Leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                🏆 Top Friends
              </h3>
              <Link href="/social" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {topFriends.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm mb-2">No friends yet</p>
                  <Link href="/social" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
                    Find study buddies
                  </Link>
                </div>
              ) : (
                topFriends.map((friend, index) => (
                  <div key={friend.id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-sm mr-3 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="text-2xl mr-3">{friend.avatar}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{friend.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Level {friend.level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{friend.tokens} 🪙</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                📅 Upcoming Deadlines
              </h3>
              <Link href="/calendar" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                View All →
              </Link>
            </div>
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
                    <Link 
                      key={assignment.id} 
                      href="/calendar"
                      className="block p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{assignment.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📅 {dueDateLabel}</p>
                          {assignment.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{assignment.description}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-2">
                            {assignment.priority && (
                              <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${getPriorityColor(assignment.priority)}`}>
                                {assignment.priority}
                              </span>
                            )}
                            {assignment.status && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize font-medium">
                                {assignment.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  )
                })
              )}
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

      {/* Context Menu */}
      {contextMenu && (
        <NoteContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => handleDeleteClick(contextMenu.noteId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteConfirm.noteTitle}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: '' })}
        isDestructive={true}
      />
    </div>
  )
}
