import { supabase } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/config'

async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.access_token) {
    throw new Error('Not authenticated - please log in')
  }
  
  return session.access_token
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    file_id: string
    file_title: string
    chunk_id: string
    similarity: number
    text: string
  }>
  timestamp: string
}

export interface ChatSession {
  id: string
  user_id: string
  session_type: string
  context_data: Record<string, any>
  started_at: string
  last_activity: string
  ended_at?: string
}

export interface ChatRequest {
  session_id?: string
  message: string
  file_ids?: string[]
}

export interface ChatResponse {
  session_id: string
  message_id: string
  response: string
  sources: Array<{
    file_id: string
    file_title: string
    chunk_id: string
    similarity: number
    text: string
  }>
}

/**
 * Send a message to chat with files
 */
export async function chatWithFiles(request: ChatRequest): Promise<ChatResponse> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/api/chat/with-files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to send message')
  }

  return response.json()
}

/**
 * Get a conversation session with all messages
 */
export async function getSession(sessionId: string): Promise<{
  session: ChatSession
  messages: ChatMessage[]
}> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to retrieve session')
  }

  return response.json()
}

/**
 * List all conversation sessions for the user
 */
export async function listSessions(limit: number = 20, offset: number = 0): Promise<{
  sessions: ChatSession[]
  total: number
}> {
  const token = await getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/api/chat/sessions?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to list sessions')
  }

  return response.json()
}

/**
 * Delete a conversation session
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete session')
  }

  return response.json()
}
