/**
 * Safe fetch utilities for reliable API calls
 * Prevents blank states and provides consistent error handling
 */

export interface ApiResult<T> {
  ok: boolean
  status: number | string
  data: T | null
  error?: string
}

const DEFAULT_TIMEOUT = 10000

/**
 * Fetch with automatic timeout to prevent hanging requests
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Safe JSON fetch that always returns a structured result
 * Never throws - always returns { ok, status, data, error }
 */
export async function safeFetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeout?: number
): Promise<ApiResult<T>> {
  const startTime = Date.now()
  
  try {
    console.debug(`[safeFetch] Starting: ${url}`)
    const response = await fetchWithTimeout(url, init, timeout)
    const elapsed = Date.now() - startTime
    
    const status = response.status
    
    if (!response.ok) {
      let message = response.statusText || 'Request failed'
      try {
        const errorBody = await response.json()
        message = errorBody?.error ?? errorBody?.message ?? message
      } catch {
        // Ignore JSON parse errors for error bodies
      }
      console.warn(`[safeFetch] Failed (${elapsed}ms): ${url} - ${status} ${message}`)
      return { ok: false, status, data: null, error: message }
    }
    
    try {
      const data = (await response.json()) as T
      console.debug(`[safeFetch] Success (${elapsed}ms): ${url}`)
      return { ok: true, status, data }
    } catch (error) {
      console.error(`[safeFetch] Parse error (${elapsed}ms): ${url}`, error)
      return {
        ok: false,
        status: 'parse_error',
        data: null,
        error: error instanceof Error ? error.message : 'Failed to parse response'
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Network error'
    console.error(`[safeFetch] Network error (${elapsed}ms): ${url}`, error)
    return { ok: false, status: 'network_error', data: null, error: message }
  }
}

/**
 * Normalize any value to an array
 * Prevents "undefined.map" errors in UI
 */
export function normalizeList<T>(value: T[] | null | undefined): T[] {
  if (!Array.isArray(value)) return []
  return value
}

/**
 * Safe Promise.allSettled wrapper with logging
 */
export async function safeAllSettled<T extends readonly unknown[] | []>(
  promises: T
): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>> }> {
  const results = await Promise.allSettled(promises)
  
  // Log any rejections for debugging
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[safeAllSettled] Promise ${index} rejected:`, result.reason)
    }
  })
  
  return results as any
}

/**
 * Extract fulfilled results from allSettled
 */
export function getFulfilledResults<T>(
  results: PromiseSettledResult<T>[]
): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value)
}

/**
 * Simple in-memory cache with TTL
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>()
  
  set(key: string, data: T, ttlMs: number = 30000) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    })
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear() {
    this.cache.clear()
  }
}

export const notesCache = new SimpleCache<any>()

export interface ApiRetryOptions {
  /**
   * Number of retry attempts after the initial call fails.
   * Total attempts = retries + 1 (initial try + retries)
   */
  retries?: number
  /** Initial delay in milliseconds before the first retry. */
  initialDelayMs?: number
  /** Multiplier applied to the delay after each retry (exponential backoff). */
  backoffMultiplier?: number
  /**
   * Optional predicate to control whether a given failure should trigger a retry.
   * Defaults to retrying on network errors, parse errors, and 5xx HTTP responses.
   */
  shouldRetry?: <T>(result: ApiResult<T>) => boolean
}

export async function retryApiCall<T>(
  operation: () => Promise<ApiResult<T>>,
  options: ApiRetryOptions = {}
): Promise<ApiResult<T>> {
  const {
    retries = 2,
    initialDelayMs = 500,
    backoffMultiplier = 2,
    shouldRetry = (result: ApiResult<T>) => {
      if (result.ok) return false
      if (result.status === 'network_error' || result.status === 'parse_error') {
        return true
      }
      if (typeof result.status === 'number') {
        return result.status >= 500
      }
      return false
    }
  } = options

  let attempt = 0
  let delay = initialDelayMs
  let lastResult: ApiResult<T> | null = null

  while (attempt <= retries) {
    const result = await operation()

    if (result.ok || !shouldRetry(result) || attempt === retries) {
      return result
    }

    lastResult = result
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(delay, 0)))
    delay *= backoffMultiplier
    attempt += 1
  }

  // If we exit the loop without returning, provide the last recorded result or a fallback network error.
  return lastResult ?? { ok: false, status: 'network_error', data: null, error: 'Request failed' }
}
