/**
 * Note Cache System
 * 
 * Implements an LRU (Least Recently Used) cache for full note data.
 * - Max 50 notes cached at once
 * - Auto-evicts notes not accessed within 10 minutes
 * - Provides instant access to recently viewed notes
 */

interface CachedNote {
  data: any // Full note object
  lastAccessed: number // Timestamp
}

interface NoteCache {
  [noteId: string]: CachedNote
}

class NoteCacheManager {
  private cache: NoteCache = {}
  private readonly MAX_CACHE_SIZE = 50
  private readonly CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start periodic cleanup every 2 minutes
    if (typeof window !== 'undefined') {
      this.startCleanup()
    }
  }

  /**
   * Get a note from cache if available and not stale
   */
  get(noteId: string): any | null {
    const cached = this.cache[noteId]
    
    if (!cached) {
      return null
    }

    const now = Date.now()
    const age = now - cached.lastAccessed

    // Check if cache entry is stale
    if (age > this.CACHE_TTL_MS) {
      delete this.cache[noteId]
      return null
    }

    // Update last accessed time
    cached.lastAccessed = now
    return cached.data
  }

  /**
   * Store a note in cache
   */
  set(noteId: string, data: any): void {
    const now = Date.now()

    // If cache is full, evict least recently used entry
    if (Object.keys(this.cache).length >= this.MAX_CACHE_SIZE && !this.cache[noteId]) {
      this.evictLRU()
    }

    this.cache[noteId] = {
      data,
      lastAccessed: now
    }
  }

  /**
   * Remove a note from cache
   */
  remove(noteId: string): void {
    delete this.cache[noteId]
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache = {}
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestId: string | null = null
    let oldestTime = Date.now()

    for (const [id, cached] of Object.entries(this.cache)) {
      if (cached.lastAccessed < oldestTime) {
        oldestTime = cached.lastAccessed
        oldestId = id
      }
    }

    if (oldestId) {
      delete this.cache[oldestId]
    }
  }

  /**
   * Remove stale entries (older than TTL)
   */
  private cleanup(): void {
    const now = Date.now()
    const idsToRemove: string[] = []

    for (const [id, cached] of Object.entries(this.cache)) {
      const age = now - cached.lastAccessed
      if (age > this.CACHE_TTL_MS) {
        idsToRemove.push(id)
      }
    }

    idsToRemove.forEach(id => delete this.cache[id])

    if (idsToRemove.length > 0) {
      console.log(`[NoteCache] Cleaned up ${idsToRemove.length} stale entries`)
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return
    }

    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 2 * 60 * 1000)
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: Object.keys(this.cache).length,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMinutes: this.CACHE_TTL_MS / (60 * 1000)
    }
  }
}

// Export singleton instance
export const noteCache = new NoteCacheManager()
