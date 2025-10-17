/**
 * Notes API client with safe fetch patterns
 * All functions return ApiResult - never throw
 */

import { supabase } from '@/lib/supabase'
import { safeFetchJson, normalizeList, notesCache, type ApiResult } from '@/lib/utils/fetchHelpers'

// Token cache with proper invalidation
let cachedToken: string | null = null
let tokenExpiry: number = 0

export async function getSessionToken(): Promise<string | null> {
  try {
    // Return cached token if still valid (cache for 5 minutes)
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken
    }
    
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[notesApi] Session error:', error)
      cachedToken = null
      return null
    }
    
    // Cache token for 5 minutes
    cachedToken = session?.access_token || null
    tokenExpiry = Date.now() + (5 * 60 * 1000)
    
    return cachedToken
  } catch (error) {
    console.error('[notesApi] Failed to get session:', error)
    cachedToken = null
    return null
  }
}

/**
 * Clear token cache (call on logout)
 */
export function clearTokenCache() {
  cachedToken = null
  tokenExpiry = 0
}

/**
 * Fetch all notes (lightweight - no content)
 */
export async function fetchNotesList(signal?: AbortSignal): Promise<ApiResult<any[]>> {
  const token = await getSessionToken()
  if (!token) {
    return { ok: false, status: 'auth_error', data: null, error: 'No authentication token' }
  }
  
  // Check cache first
  const cacheKey = 'notes:list'
  const cached = notesCache.get(cacheKey)
  if (cached) {
    console.debug('[notesApi] Using cached notes list')
    return { ok: true, status: 200, data: cached }
  }
  
  const result = await safeFetchJson<any[]>('/api/notes', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  })
  
  // Cache successful results
  if (result.ok && result.data) {
    notesCache.set(cacheKey, result.data, 30000) // 30s cache
  }
  
  return result
}

/**
 * Fetch all folders
 */
export async function fetchFoldersList(signal?: AbortSignal): Promise<ApiResult<any[]>> {
  const token = await getSessionToken()
  if (!token) {
    return { ok: false, status: 'auth_error', data: null, error: 'No authentication token' }
  }
  
  // Check cache first
  const cacheKey = 'folders:list'
  const cached = notesCache.get(cacheKey)
  if (cached) {
    console.debug('[notesApi] Using cached folders list')
    return { ok: true, status: 200, data: cached }
  }
  
  const result = await safeFetchJson<any[]>('/api/folders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  }, 5000) // Shorter timeout for folders
  
  // Cache successful results
  if (result.ok && result.data) {
    notesCache.set(cacheKey, result.data, 60000) // 60s cache (folders change less)
  }
  
  return result
}

/**
 * Fetch single note with full content
 */
export async function fetchNoteById(noteId: string, signal?: AbortSignal): Promise<ApiResult<any>> {
  const token = await getSessionToken()
  if (!token) {
    return { ok: false, status: 'auth_error', data: null, error: 'No authentication token' }
  }
  
  // Check cache first
  const cacheKey = `note:${noteId}`
  const cached = notesCache.get(cacheKey)
  if (cached) {
    console.debug(`[notesApi] Using cached note ${noteId}`)
    return { ok: true, status: 200, data: cached }
  }
  
  const result = await safeFetchJson<any>(`/api/notes/${noteId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  }, 15000) // Longer timeout for full note content
  
  // Cache successful results
  if (result.ok && result.data) {
    notesCache.set(cacheKey, result.data, 60000) // 60s cache
  }
  
  return result
}

/**
 * Invalidate caches (call after mutations)
 */
export function invalidateNotesCache() {
  notesCache.clear()
  console.debug('[notesApi] Cache cleared')
}
