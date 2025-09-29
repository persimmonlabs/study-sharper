'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface UserStats {
  totalStudyTime: number
  totalQuizzes: number
  averageScore: number
  streakDays: number
  level: number
  tokens: number
  xp: number
  xpToNextLevel: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string | null
  progress: number
  maxProgress: number
}

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email: string
  avatar: string
  theme: string
  notifications: {
    email: boolean
    push: boolean
    study_reminders: boolean
    friend_requests: boolean
    achievements: boolean
  }
}

export default function Account() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'achievements' | 'settings'>('profile')
  const [isTestMode, setIsTestMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      if (typeof window !== 'undefined') {
        const testMode = localStorage.getItem('testMode')
        const testUser = localStorage.getItem('testUser')

        if (testMode === 'true' && testUser) {
          console.log('Test mode detected, using mock account data')
          setIsTestMode(true)
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

      await fetchAccountData(user)
    }

    checkUser()
  }, [router])

  const setMockData = () => {
    const mockProfile: UserProfile = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      avatar: '👨‍🎓',
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        study_reminders: true,
        friend_requests: true,
        achievements: true
      }
    }

    const mockStats: UserStats = {
      totalStudyTime: 2840, // minutes
      totalQuizzes: 47,
      averageScore: 87.5,
      streakDays: 12,
      level: 15,
      tokens: 2450,
      xp: 8750,
      xpToNextLevel: 1250
    }

    const mockAchievements: Achievement[] = [
      {
        id: '1',
        title: 'First Steps',
        description: 'Complete your first study session',
        icon: '🎯',
        unlockedAt: '2024-01-01',
        progress: 1,
        maxProgress: 1
      },
      {
        id: '2',
        title: 'Quiz Master',
        description: 'Score 90% or higher on 10 quizzes',
        icon: '🧠',
        unlockedAt: '2024-01-10',
        progress: 10,
        maxProgress: 10
      },
      {
        id: '3',
        title: 'Streak Warrior',
        description: 'Maintain a 30-day study streak',
        icon: '🔥',
        unlockedAt: null,
        progress: 12,
        maxProgress: 30
      },
      {
        id: '4',
        title: 'Social Butterfly',
        description: 'Add 5 study friends',
        icon: '👥',
        unlockedAt: null,
        progress: 3,
        maxProgress: 5
      },
      {
        id: '5',
        title: 'Token Collector',
        description: 'Earn 5000 tokens',
        icon: '💰',
        unlockedAt: null,
        progress: 2450,
        maxProgress: 5000
      }
    ]

    setUserProfile(mockProfile)
    setUserStats(mockStats)
    setAchievements(mockAchievements)
  }

  const fetchAccountData = async (user: any) => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: user.email,
          avatar: profile.avatar || '👤',
          theme: profile.theme || 'light',
          notifications: profile.notifications || {
            email: true,
            push: true,
            study_reminders: true,
            friend_requests: true,
            achievements: true
          }
        })
      }

      // Fetch user stats (you'd implement these queries based on your schema)
      setUserStats({
        totalStudyTime: 0,
        totalQuizzes: 0,
        averageScore: 0,
        streakDays: 0,
        level: 1,
        tokens: 0,
        xp: 0,
        xpToNextLevel: 100
      })

      setAchievements([])
    } catch (error) {
      console.error('Error fetching account data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (isTestMode) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('testUser')
        localStorage.removeItem('testMode')
      }
      router.push('/auth/login')
    } else {
      await supabase.auth.signOut()
      router.push('/auth/login')
    }
  }

  const avatarOptions = ['👨‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻', '🧑‍🔬', '👨‍🏫', '👩‍🏫', '🤓', '😊', '🌟']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading account...</div>
      </div>
    )
  }

  if (!userProfile || !userStats) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Error loading account data</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your profile, view achievements, and customize your experience</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          {[
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'stats', label: 'Statistics', icon: '📊' },
            { id: 'achievements', label: 'Achievements', icon: '🏆' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Profile Header */}
              <div className="flex items-center space-x-6">
                <div className="text-6xl">{userProfile.avatar}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {userProfile.first_name} {userProfile.last_name}
                  </h2>
                  <p className="text-gray-600">{userProfile.email}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                      Level {userStats.level}
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      {userStats.tokens} Tokens
                    </span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {userStats.streakDays} Day Streak
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress to Level {userStats.level + 1}</span>
                  <span className="text-sm text-gray-500">{userStats.xp} / {userStats.xp + userStats.xpToNextLevel} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-primary-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${(userStats.xp / (userStats.xp + userStats.xpToNextLevel)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Avatar Customization */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Avatar</h3>
                <div className="grid grid-cols-5 gap-4">
                  {avatarOptions.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setUserProfile({...userProfile, avatar})}
                      className={`text-4xl p-4 rounded-lg border-2 transition-colors ${
                        userProfile.avatar === avatar
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Balance */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Token Balance</h3>
                    <p className="text-yellow-100">Spend tokens on avatar items, themes, and premium features</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{userStats.tokens}</div>
                    <div className="text-yellow-100">Tokens</div>
                  </div>
                </div>
                <button className="mt-4 bg-white text-yellow-600 px-4 py-2 rounded-lg font-medium hover:bg-yellow-50 transition-colors">
                  Visit Token Store
                </button>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-8">
              <h3 className="text-lg font-semibold text-gray-900">Your Study Statistics</h3>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{Math.floor(userStats.totalStudyTime / 60)}h</div>
                  <div className="text-blue-800 font-medium">Total Study Time</div>
                  <div className="text-sm text-blue-600 mt-1">{userStats.totalStudyTime % 60}m additional</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">{userStats.totalQuizzes}</div>
                  <div className="text-green-800 font-medium">Quizzes Completed</div>
                  <div className="text-sm text-green-600 mt-1">Keep practicing!</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">{userStats.averageScore}%</div>
                  <div className="text-purple-800 font-medium">Average Score</div>
                  <div className="text-sm text-purple-600 mt-1">Great performance!</div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{userStats.streakDays}</div>
                  <div className="text-orange-800 font-medium">Day Streak</div>
                  <div className="text-sm text-orange-600 mt-1">Keep it up! 🔥</div>
                </div>
              </div>

              {/* Study Time Chart Placeholder */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Study Time This Week</h4>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p>Study time chart coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Your Achievements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map(achievement => (
                  <div 
                    key={achievement.id} 
                    className={`border rounded-lg p-6 ${
                      achievement.unlockedAt ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`text-3xl mr-4 ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div>
                          <h4 className={`font-semibold ${achievement.unlockedAt ? 'text-yellow-800' : 'text-gray-600'}`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm ${achievement.unlockedAt ? 'text-yellow-700' : 'text-gray-500'}`}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      {achievement.unlockedAt && (
                        <div className="text-yellow-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {!achievement.unlockedAt && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{achievement.progress} / {achievement.maxProgress}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {achievement.unlockedAt && (
                      <div className="text-sm text-yellow-700">
                        Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
              
              {/* Notification Preferences */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Notification Preferences</h4>
                <div className="space-y-4">
                  {Object.entries(userProfile.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {key.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {key === 'email' && 'Receive email notifications'}
                          {key === 'push' && 'Receive push notifications'}
                          {key === 'study_reminders' && 'Get reminders for study sessions'}
                          {key === 'friend_requests' && 'Notifications for friend requests'}
                          {key === 'achievements' && 'Celebrate your achievements'}
                        </div>
                      </div>
                      <button
                        onClick={() => setUserProfile({
                          ...userProfile,
                          notifications: {
                            ...userProfile.notifications,
                            [key]: !value
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Selection */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Theme Preference</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['light', 'dark', 'auto'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => setUserProfile({...userProfile, theme})}
                      className={`p-4 rounded-lg border-2 text-center transition-colors capitalize ${
                        userProfile.theme === theme
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {theme === 'light' && '☀️'}
                      {theme === 'dark' && '🌙'}
                      {theme === 'auto' && '🔄'}
                      <div className="mt-2 font-medium">{theme}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Privacy Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Profile Visibility</div>
                      <div className="text-sm text-gray-600">Who can see your profile and study stats</div>
                    </div>
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option>Everyone</option>
                      <option>Friends Only</option>
                      <option>Private</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Study Activity</div>
                      <div className="text-sm text-gray-600">Show your study sessions to friends</div>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h4 className="font-semibold text-red-900 mb-4">Danger Zone</h4>
                <div className="space-y-4">
                  <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Delete Account
                  </button>
                  <p className="text-sm text-red-700">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
