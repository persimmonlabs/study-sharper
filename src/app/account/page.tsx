'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/components/ThemeProvider'
import type { User } from '@supabase/supabase-js'

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

const DEFAULT_AVATAR = '👤'

export default function Account() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'achievements' | 'settings'>('profile')
  const router = useRouter()
  const { user, loading: authLoading, signOut, profile, profileLoading, refreshProfile } = useAuth()
  const { theme: currentTheme, setTheme, actualTheme } = useTheme()
  const [avatarPending, startAvatarTransition] = useTransition()

  const defaultNotifications = useMemo(() => ({
    email: true,
    push: true,
    study_reminders: true,
    friend_requests: true,
    achievements: true,
  }), [])

  const handleThemeChange = useCallback(async (newTheme: string) => {
    if (!user || !userProfile) return

    // Update local state
    setUserProfile({ ...userProfile, theme: newTheme })

    // Update ThemeProvider state (this handles the UI theme change)
    setTheme(newTheme as 'light' | 'dark' | 'auto')

    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            first_name: user.user_metadata?.first_name ?? null,
            last_name: user.user_metadata?.last_name ?? null,
            theme: newTheme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (error) {
        console.error('Error saving theme preference:', error)
      }
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }, [user, userProfile, setTheme])

  const getDefaultProfile = useCallback((currentUser: User | null): UserProfile | null => {
    if (!currentUser) {
      return null
    }

    return {
      first_name: currentUser.user_metadata?.first_name ?? null,
      last_name: currentUser.user_metadata?.last_name ?? null,
      email: currentUser.email ?? '',
      avatar: DEFAULT_AVATAR,
      theme: 'light',
      notifications: { ...defaultNotifications },
    }
  }, [defaultNotifications])

  const defaultStats: UserStats = useMemo(() => ({
    totalStudyTime: 0,
    totalQuizzes: 0,
    averageScore: 0,
    streakDays: 0,
    level: 1,
    tokens: 0,
    xp: 0,
    xpToNextLevel: 100,
  }), [])

  const fetchUserStats = useCallback(async (currentUser: User) => {
    try {
      // Placeholder: aggregate stats from tables when available
      const { data: sessionData, error: sessionError } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', currentUser.id)

      if (sessionError) {
        throw sessionError
      }

      const totalStudyTime = (sessionData ?? []).reduce((total, session) => total + (session.duration_minutes ?? 0), 0)

      setUserStats({
        totalStudyTime,
        totalQuizzes: 0,
        averageScore: 0,
        streakDays: 0,
        level: 1,
        tokens: 0,
        xp: 0,
        xpToNextLevel: 100,
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
      setUserStats(defaultStats)
    }
  }, [defaultStats])

  const fetchAchievements = useCallback(async (_currentUser: User) => {
    try {
      // Placeholder: replace with real achievements query when available
      setAchievements([])
    } catch (error) {
      console.error('Error fetching achievements:', error)
      setAchievements([])
    }
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    if (profile) {
      setUserProfile((prev) => {
        const fallback = getDefaultProfile(user)
        if (!fallback) {
          return prev
        }

        const base = {
          ...fallback,
          theme: prev?.theme ?? fallback.theme,
          notifications: { ...(prev?.notifications ?? fallback.notifications) },
        }

        return {
          ...base,
          first_name: profile.first_name ?? base.first_name,
          last_name: profile.last_name ?? base.last_name,
          email: profile.email ?? base.email,
          avatar: profile.avatar_url ?? base.avatar ?? DEFAULT_AVATAR,
        }
      })
    } else if (!profileLoading) {
      const fallback = getDefaultProfile(user)
      if (fallback) {
        setUserProfile((prev) => prev ?? fallback)
      }
    }
  }, [profile, profileLoading, user, getDefaultProfile])

  const handleAvatarSelect = useCallback((avatar: string) => {
    if (!user || !userProfile) {
      return
    }

    const previousAvatar = userProfile.avatar ?? DEFAULT_AVATAR
    setUserProfile((prev) => (prev ? { ...prev, avatar } : prev))

    startAvatarTransition(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email ?? null,
              first_name: user.user_metadata?.first_name ?? null,
              last_name: user.user_metadata?.last_name ?? null,
              avatar_url: avatar,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )

        if (error) {
          throw error
        }

        await refreshProfile()

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profile-avatar-updated', { detail: avatar }))
        }
      } catch (error) {
        console.error('Error updating avatar:', error)
        setUserProfile((prev) => (prev ? { ...prev, avatar: previousAvatar } : prev))
      }
    })
  }, [refreshProfile, startAvatarTransition, user, userProfile])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setLoading(false)
      const nextParam = encodeURIComponent('/account')
      router.push(`/auth/login?next=${nextParam}`)
      return
    }

    const loadAccount = async () => {
      try {
        await fetchUserStats(user)
        await fetchAchievements(user)
      } catch (error) {
        console.error('Error loading account data:', error)
        const fallback = getDefaultProfile(user)
        if (fallback) {
          setUserProfile(fallback)
        }
        setUserStats(defaultStats)
        setAchievements([])
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [authLoading, defaultStats, fetchAchievements, fetchUserStats, getDefaultProfile, router, user])

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
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
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-gray-50 dark:bg-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {userProfile.first_name} {userProfile.last_name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{userProfile.email}</p>
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress to Level {userStats.level + 1}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">{userStats.xp} / {userStats.xp + userStats.xpToNextLevel} XP</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-primary-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${(userStats.xp / (userStats.xp + userStats.xpToNextLevel)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Avatar Customization */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Choose Your Avatar</h3>
                <div className="grid grid-cols-5 gap-4">
                  {avatarOptions.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setUserProfile({...userProfile, avatar})}
                      className={`text-4xl p-4 rounded-lg border-2 transition-colors ${
                        userProfile.avatar === avatar
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Study Statistics</h3>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{Math.floor(userStats.totalStudyTime / 60)}h</div>
                  <div className="text-primary-800 dark:text-primary-200 font-medium">Total Study Time</div>
                  <div className="text-sm text-primary-600 dark:text-primary-400 mt-1">{userStats.totalStudyTime % 60}m additional</div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{userStats.totalQuizzes}</div>
                  <div className="text-green-800 dark:text-green-200 font-medium">Quizzes Completed</div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">Keep practicing!</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{userStats.averageScore}%</div>
                  <div className="text-purple-800 dark:text-purple-200 font-medium">Average Score</div>
                  <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Great performance!</div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{userStats.streakDays}</div>
                  <div className="text-orange-800 dark:text-orange-200 font-medium">Day Streak</div>
                  <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">Keep it up! 🔥</div>
                </div>
              </div>

              {/* Study Time Chart Placeholder */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Study Time This Week</h4>
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Achievements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map(achievement => (
                  <div 
                    key={achievement.id} 
                    className={`border border-gray-200 dark:border-gray-600 rounded-lg p-6 ${
                      achievement.unlockedAt ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`text-3xl mr-4 ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div>
                          <h4 className={`font-semibold ${achievement.unlockedAt ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-600 dark:text-gray-400'}`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm ${achievement.unlockedAt ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-500 dark:text-gray-500'}`}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      {achievement.unlockedAt && (
                        <div className="text-yellow-600 dark:text-yellow-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {!achievement.unlockedAt && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>Progress</span>
                          <span>{achievement.progress} / {achievement.maxProgress}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {achievement.unlockedAt && (
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Settings</h3>
              
              {/* Notification Preferences */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h4>
                <div className="space-y-4">
                  {Object.entries(userProfile.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {key.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
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
                          value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Theme Preference</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['light', 'dark', 'auto'].map(themeOption => {
                    // Determine if this option should be highlighted
                    let isSelected = false
                    if (themeOption === 'auto') {
                      // For auto mode, highlight it if that's the user's preference
                      isSelected = currentTheme === 'auto'
                    } else {
                      // For light/dark, highlight if it matches the current actual theme
                      // OR if the user explicitly prefers it (when not in auto mode)
                      isSelected = actualTheme === themeOption && (currentTheme === 'auto' || currentTheme === themeOption)
                    }

                    return (
                      <button
                        key={themeOption}
                        onClick={() => handleThemeChange(themeOption)}
                        className={`p-4 rounded-lg border-2 text-center transition-colors capitalize ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-gray-700 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {themeOption === 'light' && '☀️'}
                        {themeOption === 'dark' && '🌙'}
                        {themeOption === 'auto' && '🔄'}
                        <div className="mt-2 font-medium">{themeOption}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Privacy Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Profile Visibility</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Who can see your profile and study stats</div>
                    </div>
                    <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option>Everyone</option>
                      <option>Friends Only</option>
                      <option>Private</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Study Activity</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Show your study sessions to friends</div>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 dark:bg-primary-500">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h4 className="font-semibold text-red-900 dark:text-red-200 mb-4">Danger Zone</h4>
                <div className="space-y-4">
                  <button className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors">
                    Delete Account
                  </button>
                  <p className="text-sm text-red-700 dark:text-red-300">
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
