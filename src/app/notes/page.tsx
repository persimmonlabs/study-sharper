'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/lib/supabase'

type Note = Database['public']['Tables']['notes']['Row'] & {
  summary?: string
  tags?: string[]
  file_type?: string
  transcription?: string
  highlights?: Array<{
    id: string
    text: string
    color: string
    position: number
  }>
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  noteId?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  summary?: string
  transcription?: string
}

export default function Notes() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'summaries' | 'search'>('upload')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // Check for test mode first
      if (typeof window !== 'undefined') {
        const testMode = localStorage.getItem('testMode')
        const testUser = localStorage.getItem('testUser')

        if (testMode === 'true' && testUser) {
          console.log('Test mode detected, using mock user data')
          
          // Set mock notes with AI features
          const mockNotes: Note[] = [
            {
              id: '1',
              title: 'Calculus Derivatives - Chapter 3',
              content: 'Derivatives are fundamental to calculus. The derivative of a function represents the rate of change...',
              tags: ['mathematics', 'calculus', 'derivatives'],
              summary: 'Comprehensive notes on derivatives including power rule, product rule, and chain rule with examples.',
              file_type: 'pdf',
              created_at: '2024-01-10T10:00:00Z',
              updated_at: '2024-01-10T10:00:00Z',
              user_id: 'test-user',
              highlights: [
                { id: '1', text: 'Power rule: d/dx(x^n) = nx^(n-1)', color: 'yellow', position: 150 },
                { id: '2', text: 'Chain rule for composite functions', color: 'blue', position: 300 }
              ]
            },
            {
              id: '2',
              title: 'World War II Audio Lecture',
              content: 'Transcription: Today we discuss the major events of World War II, starting with the invasion of Poland in 1939...',
              tags: ['history', 'world-war-2', 'lecture'],
              summary: 'Audio lecture covering WWII timeline, major battles, and political consequences.',
              file_type: 'audio',
              transcription: 'Today we discuss the major events of World War II, starting with the invasion of Poland in 1939. The war fundamentally changed the global political landscape...',
              created_at: '2024-01-09T14:30:00Z',
              updated_at: '2024-01-09T14:30:00Z',
              user_id: 'test-user'
            },
            {
              id: '3',
              title: 'Organic Chemistry Lab Report',
              content: 'Lab experiment on synthesis of aspirin. Procedure, observations, and analysis of results.',
              tags: ['chemistry', 'organic', 'lab-report'],
              summary: 'Lab report documenting aspirin synthesis with yield calculations and purity analysis.',
              file_type: 'document',
              created_at: '2024-01-08T16:45:00Z',
              updated_at: '2024-01-08T16:45:00Z',
              user_id: 'test-user'
            }
          ]
          
          // Set mock chat messages
          const mockChatMessages: ChatMessage[] = [
            {
              id: '1',
              type: 'user',
              content: 'Can you explain the chain rule from my calculus notes?',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              noteId: '1'
            },
            {
              id: '2',
              type: 'ai',
              content: 'Based on your calculus notes, the chain rule is used to find the derivative of composite functions. If you have f(g(x)), the derivative is f\'(g(x)) × g\'(x). For example, if f(x) = (3x + 1)², you would use the chain rule: derivative = 2(3x + 1) × 3 = 6(3x + 1).',
              timestamp: new Date(Date.now() - 3590000).toISOString(),
              noteId: '1'
            },
            {
              id: '3',
              type: 'user',
              content: 'What were the main causes of World War II according to my history notes?',
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              noteId: '2'
            },
            {
              id: '4',
              type: 'ai',
              content: 'According to your history lecture notes, the main causes of WWII included: 1) The harsh terms of the Treaty of Versailles, 2) Economic instability from the Great Depression, 3) Rise of totalitarian regimes in Germany, Italy, and Japan, 4) Failure of the League of Nations to maintain peace, and 5) Aggressive expansionist policies by Axis powers.',
              timestamp: new Date(Date.now() - 1790000).toISOString(),
              noteId: '2'
            }
          ]
          
          // Set mock uploaded files
          const mockUploadedFiles: UploadedFile[] = [
            {
              id: '1',
              name: 'Physics_Chapter_5.pdf',
              type: 'application/pdf',
              size: 2456789,
              url: '/mock/physics.pdf',
              status: 'completed',
              summary: 'Chapter 5 covers electromagnetic waves, their properties, and applications in modern technology.'
            },
            {
              id: '2',
              name: 'Biology_Lecture_Recording.mp3',
              type: 'audio/mp3',
              size: 15678432,
              url: '/mock/biology.mp3',
              status: 'processing',
              transcription: 'Partial transcription: Cell division is a fundamental process...'
            }
          ]
          
          setNotes(mockNotes)
          setChatMessages(mockChatMessages)
          setUploadedFiles(mockUploadedFiles)
          setAvailableTags(['mathematics', 'calculus', 'derivatives', 'history', 'world-war-2', 'lecture', 'chemistry', 'organic', 'lab-report', 'physics', 'biology'])
          setLoading(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      await fetchNotes()
    }

    checkUser()
  }, [router])

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching notes:', error)
      } else {
        setNotes(data || [])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    
    const matchesTags = selectedTags.length === 0 || 
      (note.tags && selectedTags.every(tag => note.tags?.includes(tag)))
    
    return matchesSearch && matchesTags
  })

  const handleFileUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const newFile: UploadedFile = {
        id: Date.now().toString() + i,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        status: 'uploading'
      }
      
      setUploadedFiles(prev => [...prev, newFile])
      
      // Simulate upload and processing
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id ? { ...f, status: 'processing' } : f
        ))
      }, 1000)
      
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id ? { 
            ...f, 
            status: 'completed',
            summary: `AI-generated summary for ${file.name}`,
            transcription: file.type.startsWith('audio') ? 'AI-generated transcription...' : undefined
          } : f
        ))
      }, 3000)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
      noteId: selectedNote?.id
    }
    
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Based on your notes, I can help you with that. ${selectedNote ? `Looking at "${selectedNote.title}", ` : ''}here's what I found...`,
        timestamp: new Date().toISOString(),
        noteId: selectedNote?.id
      }
      setChatMessages(prev => [...prev, aiMessage])
    }, 1500)
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('audio')) return '🎵'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    return '📄'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'processing': return 'text-yellow-600'
      case 'uploading': return 'text-blue-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading notes...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Notes</h1>
            <div className="flex items-center space-x-4 text-sm">
              <p className="text-primary-100">Create, manage, and organize your study notes</p>
              <span className="text-primary-200 text-xs">•</span>
              <p className="text-primary-200 text-xs">Interact with your notes with AI power</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'w-80' : 'w-16'
        } bg-white shadow-lg transition-all duration-300 flex flex-col border-r border-gray-200`}>

          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className={`font-semibold text-gray-900 ${!sidebarOpen && 'hidden'}`}>
              Saved Notes
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>

          {/* Search */}
          {sidebarOpen && (
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {sidebarOpen ? (
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No notes yet</p>
                  </div>
                ) : (
                  <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
            ) : (
              <div className="p-2">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedNote?.id === note.id
                        ? 'bg-primary-100 border border-primary-300'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <h3 className={`font-medium text-gray-900 line-clamp-1 ${!sidebarOpen && 'hidden'}`}>
                      {note.title}
                    </h3>
                    <p className={`text-sm text-gray-600 line-clamp-2 mt-1 ${!sidebarOpen && 'hidden'}`}>
                      {note.content}
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-8">
            {/* Recent Files Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Files</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredNotes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="font-medium text-gray-900 line-clamp-1">{note.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No recent files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Create Notes Manually Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Notes Manually</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Note Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter note title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Write your note content here..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., biology, chapter 1, important"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">Title: [Note Title]</p>
                      <p className="mt-2">[Note Content]</p>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Tags: </span>
                        <span className="text-xs text-primary-600">[tags]</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                      Save Note
                    </button>
                    <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Chat Interface */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">AI Study Assistant</h2>
                <div className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                  AI
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">🤖</div>
                    <p>Ask me anything about your notes!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.slice(-5).map(message => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.type === 'user' 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-white border'
                        }`}>
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about your notes..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>

            {/* AI-Powered Upload */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered File Upload</h2>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files)
                }}
              >
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-lg font-medium text-gray-900 mb-2">AI-Enhanced Processing</p>
                <p className="text-sm text-gray-600 mb-4">
                  Upload files for automatic transcription, summarization, and smart tagging
                </p>
                <div className="flex justify-center space-x-4">
                  <label className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
                    Choose Files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    />
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  <p>PDF, DOCX, TXT, Images, Audio • Max 50MB</p>
                  <p>🎤 Audio transcription • 📋 Auto-summaries • 🏷️ Smart tags</p>
                </div>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Processing Queue</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xl mr-3">{getFileIcon(file.type)}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{file.name}</div>
                          <div className={`text-xs ${getStatusColor(file.status)}`}>
                            {file.status === 'completed' ? '✅ AI Processing Complete' : '🤖 Processing...'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}