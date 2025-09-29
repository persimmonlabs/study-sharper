'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Friend {
  id: string
  name: string
  avatar: string
  level: number
  tokens: number
  streak: number
  status: 'online' | 'offline' | 'studying'
}

interface StudyGroup {
  id: string
  name: string
  description: string
  members: number
  subject: string
  isJoined: boolean
}

interface Challenge {
  id: string
  title: string
  description: string
  type: 'quiz' | 'study_time' | 'streak'
  reward: number
  deadline: string
  participants: number
}

export default function Social() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [leaderboard, setLeaderboard] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'challenges' | 'leaderboard'>('friends')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      if (typeof window !== 'undefined') {
        const testMode = localStorage.getItem('testMode')
        const testUser = localStorage.getItem('testUser')

        if (testMode === 'true' && testUser) {
          console.log('Test mode detected, using mock social data')
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

      await fetchSocialData()
    }

    checkUser()
  }, [router])

  const setMockData = () => {
    const mockFriends: Friend[] = [
      {
        id: '1',
        name: 'Alex Johnson',
        avatar: '👨‍🎓',
        level: 15,
        tokens: 2450,
        streak: 7,
        status: 'studying'
      },
      {
        id: '2',
        name: 'Sarah Chen',
        avatar: '👩‍🎓',
        level: 12,
        tokens: 1890,
        streak: 12,
        status: 'online'
      },
      {
        id: '3',
        name: 'Mike Rodriguez',
        avatar: '👨‍💻',
        level: 18,
        tokens: 3200,
        streak: 5,
        status: 'offline'
      }
    ]

    const mockGroups: StudyGroup[] = [
      {
        id: '1',
        name: 'Calculus Masters',
        description: 'Advanced calculus study group for exam prep',
        members: 24,
        subject: 'Mathematics',
        isJoined: true
      },
      {
        id: '2',
        name: 'History Buffs',
        description: 'World history discussion and study sessions',
        members: 18,
        subject: 'History',
        isJoined: false
      },
      {
        id: '3',
        name: 'Chemistry Lab Partners',
        description: 'Organic chemistry problem solving group',
        members: 31,
        subject: 'Chemistry',
        isJoined: true
      }
    ]

    const mockChallenges: Challenge[] = [
      {
        id: '1',
        title: 'Week-long Study Streak',
        description: 'Study for at least 1 hour every day for 7 days',
        type: 'streak',
        reward: 500,
        deadline: '2024-01-21',
        participants: 156
      },
      {
        id: '2',
        title: 'Math Quiz Champion',
        description: 'Score 90% or higher on 5 math quizzes',
        type: 'quiz',
        reward: 300,
        deadline: '2024-01-18',
        participants: 89
      }
    ]

    setFriends(mockFriends)
    setStudyGroups(mockGroups)
    setChallenges(mockChallenges)
    setLeaderboard(mockFriends.sort((a, b) => b.tokens - a.tokens))
  }

  const fetchSocialData = async () => {
    try {
      // In a real app, you'd fetch from your database
      setLoading(false)
    } catch (error) {
      console.error('Error fetching social data:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400'
      case 'studying': return 'bg-blue-400'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online'
      case 'studying': return 'Studying'
      case 'offline': return 'Offline'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading social features...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
          <p className="text-gray-600 mt-2">Connect with study buddies, join groups, and compete in challenges</p>
        </div>
        <div className="flex space-x-4">
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Find Study Buddy
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Create Group
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          {[
            { id: 'friends', label: 'Friends', icon: '👥' },
            { id: 'groups', label: 'Study Groups', icon: '📚' },
            { id: 'challenges', label: 'Challenges', icon: '🏆' },
            { id: 'leaderboard', label: 'Leaderboard', icon: '📊' }
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
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Your Study Friends</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Add Friends
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(friend => (
                  <div key={friend.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="text-3xl mr-3">{friend.avatar}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{friend.name}</h4>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(friend.status)}`}></div>
                          <span className="text-sm text-gray-600">{getStatusText(friend.status)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-primary-600">Lv.{friend.level}</div>
                        <div className="text-xs text-gray-500">Level</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600">{friend.tokens}</div>
                        <div className="text-xs text-gray-500">Tokens</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{friend.streak}</div>
                        <div className="text-xs text-gray-500">Streak</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-primary-100 text-primary-700 py-2 px-3 rounded text-sm hover:bg-primary-200 transition-colors">
                        Challenge
                      </button>
                      <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors">
                        Study Together
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Groups Tab */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Study Groups</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Browse All Groups
                </button>
              </div>
              
              <div className="space-y-4">
                {studyGroups.map(group => (
                  <div key={group.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="text-lg font-medium text-gray-900 mr-3">{group.name}</h4>
                          {group.isJoined && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Joined
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{group.description}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="mr-4">👥 {group.members} members</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {group.subject}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {group.isJoined ? (
                          <>
                            <button className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors">
                              Enter Room
                            </button>
                            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors">
                              Leave
                            </button>
                          </>
                        ) : (
                          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                            Join Group
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges Tab */}
          {activeTab === 'challenges' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Active Challenges</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Create Challenge
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {challenges.map(challenge => (
                  <div key={challenge.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">{challenge.title}</h4>
                        <p className="text-gray-600 mb-3">{challenge.description}</p>
                      </div>
                      <div className="text-2xl">
                        {challenge.type === 'quiz' ? '🧠' : 
                         challenge.type === 'streak' ? '🔥' : '⏱️'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-yellow-600">{challenge.reward}</div>
                          <div className="text-xs text-gray-500">Tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{challenge.participants}</div>
                          <div className="text-xs text-gray-500">Participants</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Ends</div>
                        <div className="text-sm font-medium">
                          {new Date(challenge.deadline).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <button className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors">
                      Join Challenge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Global Leaderboard</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">
                    This Week
                  </button>
                  <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    All Time
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div key={user.id} className={`flex items-center p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                    index === 1 ? 'bg-gray-50 border border-gray-200' :
                    index === 2 ? 'bg-orange-50 border border-orange-200' :
                    'bg-white border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold mr-4">
                      {index + 1}
                    </div>
                    <div className="text-2xl mr-4">{user.avatar}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      <div className="text-sm text-gray-600">Level {user.level} • {user.streak} day streak</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-600">{user.tokens}</div>
                      <div className="text-xs text-gray-500">tokens</div>
                    </div>
                    {index < 3 && (
                      <div className="ml-4 text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
