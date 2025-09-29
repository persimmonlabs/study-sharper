'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  type: 'token_earned' | 'achievement' | 'quiz_completed' | 'study_session'
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
  const [isTestMode, setIsTestMode] = useState(false)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [topFriends, setTopFriends] = useState<Friend[]>([])
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
  const [dailyGoalProgress, setDailyGoalProgress] = useState({ current: 0, target: 240 }) // minutes
  const [weeklyGoalProgress, setWeeklyGoalProgress] = useState({ current: 0, target: 1200 }) // minutes
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // Check for test mode first (only on client side)
      if (typeof window !== 'undefined') {
        const testMode = localStorage.getItem('testMode')
        const testUser = localStorage.getItem('testUser')

        if (testMode === 'true' && testUser) {
          console.log('Test mode detected, using mock user data')
          try {
            const userData = JSON.parse(testUser)
            setUserProfile({
              first_name: userData.user_metadata?.first_name || 'Test',
              last_name: userData.user_metadata?.last_name || 'User'
            })
            setIsTestMode(true)
            // Set mock stats for test user
            setStats({
              totalNotes: 12,
              totalAssignments: 5,
              upcomingAssignments: 3,
              totalStudyTime: 2840,
              quizzesCompleted: 47,
              streakDays: 12,
              tokens: 2450,
              xp: 8750,
              level: 15,
            })
            
            // Set mock activity data
            setRecentActivity([
              {
                id: '1',
                type: 'token_earned',
                title: 'Daily Login Bonus',
                description: 'Earned 50 tokens for logging in',
                tokens: 50,
                timestamp: new Date().toISOString(),
                icon: '💰'
              },
              {
                id: '2',
                type: 'achievement',
                title: 'Quiz Master',
                description: 'Unlocked for scoring 90%+ on 10 quizzes',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                icon: '🏆'
              },
              {
                id: '3',
                type: 'study_session',
                title: 'Math Study Session',
                description: 'Completed 90-minute focused study session',
                tokens: 100,
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                icon: '📚'
              }
            ])
            
            // Set mock friends data
            setTopFriends([
              { id: '1', name: 'Alex Johnson', avatar: '👨‍🎓', tokens: 3200, level: 18 },
              { id: '2', name: 'Sarah Chen', avatar: '👩‍🎓', tokens: 2890, level: 16 },
              { id: '3', name: 'Mike Rodriguez', avatar: '👨‍💻', tokens: 2650, level: 15 }
            ])
            
            // Set mock AI recommendations
            setAIRecommendations([
              {
                id: '1',
                title: 'Review Calculus Derivatives',
                description: 'Based on your recent quiz performance, reviewing derivatives would help',
                type: 'review',
                subject: 'Mathematics',
                priority: 'high'
              },
              {
                id: '2',
                title: 'Practice World War II Quiz',
                description: 'You haven\'t practiced history in 3 days',
                type: 'quiz',
                subject: 'History',
                priority: 'medium'
              }
            ])
            
            // Set mock goal progress
            setDailyGoalProgress({ current: 150, target: 240 })
            setWeeklyGoalProgress({ current: 720, target: 1200 })
            
            setLoading(false)
            return
          } catch (error) {
            console.error('Error parsing test user data:', error)
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch user profile and dashboard stats
      await fetchUserProfile()
      await fetchStats()
    }

    checkUser()
  }, [router])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Set default values if profile fetch fails
      setUserProfile({ first_name: 'User', last_name: null })
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get notes count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Get assignments count
      const { count: assignmentsCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Get upcoming assignments (due in next 7 days)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const { count: upcomingCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lt('due_date', sevenDaysFromNow.toISOString())
        .gt('due_date', new Date().toISOString())

      // Get total study time
      const { data: studySessions } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)

      const totalStudyTime = studySessions?.reduce(
        (total, session) => total + session.duration_minutes,
        0
      ) || 0

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
    } finally {
      setLoading(false)
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
    if (isTestMode) {
      // Clear test session
      if (typeof window !== 'undefined') {
        localStorage.removeItem('testUser')
        localStorage.removeItem('testMode')
      }
      router.push('/auth/login')
    } else {
      // Normal logout
      await supabase.auth.signOut()
      router.push('/auth/login')
    }
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
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Test Mode Active</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're using a test account. Some features may be limited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Level & Tokens */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {firstName}! 🎓
          </h1>
          <p className="text-gray-600 mt-2">Ready to continue your learning journey?</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold">Level {stats.level}</div>
              <div className="text-xs opacity-90">{stats.xp} XP</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold">{stats.tokens}</div>
              <div className="text-xs opacity-90">Tokens</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
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
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Goal</h3>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Study Time</span>
            <span>{dailyGoalProgress.current}m / {dailyGoalProgress.target}m</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((dailyGoalProgress.current / dailyGoalProgress.target) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {Math.round((dailyGoalProgress.current / dailyGoalProgress.target) * 100)}% complete
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Goal</h3>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Study Time</span>
            <span>{Math.floor(weeklyGoalProgress.current / 60)}h {weeklyGoalProgress.current % 60}m / {Math.floor(weeklyGoalProgress.target / 60)}h</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((weeklyGoalProgress.current / weeklyGoalProgress.target) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {Math.round((weeklyGoalProgress.current / weeklyGoalProgress.target) * 100)}% complete
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">📚</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalNotes}</div>
          <div className="text-sm text-gray-600">Notes</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">📝</div>
          <div className="text-2xl font-bold text-green-600">{stats.totalAssignments}</div>
          <div className="text-sm text-gray-600">Assignments</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">🧠</div>
          <div className="text-2xl font-bold text-purple-600">{stats.quizzesCompleted}</div>
          <div className="text-sm text-gray-600">Quizzes</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-orange-600">{Math.floor(stats.totalStudyTime / 60)}h</div>
          <div className="text-sm text-gray-600">Study Time</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.xp}</div>
          <div className="text-sm text-gray-600">XP</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-2xl mb-2">⏰</div>
          <div className="text-2xl font-bold text-red-600">{stats.upcomingAssignments}</div>
          <div className="text-sm text-gray-600">Due Soon</div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Activity & AI Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mr-4">{activity.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {activity.tokens && (
                    <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                      +{activity.tokens} tokens
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Study Recommendations</h3>
              <div className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                AI
              </div>
            </div>
            <div className="space-y-4">
              {aiRecommendations.map(rec => (
                <div key={rec.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
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
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Friends 🏆</h3>
            <div className="space-y-3">
              {topFriends.map((friend, index) => (
                <div key={friend.id} className="flex items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="text-xl mr-3">{friend.avatar}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{friend.name}</div>
                    <div className="text-xs text-gray-600">Level {friend.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-600">{friend.tokens}</div>
                    <div className="text-xs text-gray-500">tokens</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/social" className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium mt-4">
              View All Friends →
            </Link>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <div className="text-red-600 mr-3">📝</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">Math Homework</div>
                  <div className="text-xs text-red-600">Due tomorrow</div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-yellow-600 mr-3">📚</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">History Essay</div>
                  <div className="text-xs text-yellow-600">Due in 3 days</div>
                </div>
              </div>
            </div>
            <Link href="/calendar" className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium mt-4">
              View Calendar →
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
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
    </div>
  )
}
