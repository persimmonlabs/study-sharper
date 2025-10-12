/**
 * API Types for Study Sharper
 * 
 * These types match the Pydantic models defined in the backend API.
 * Keep these synchronized with the backend response models.
 */

// ============================================================================
// Note Types
// ============================================================================

/**
 * Represents a note/document in the system
 */
export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  tags: string[] | null
  folder_id: string | null
  file_path: string | null
  extracted_text: string | null
  file_size: number | null
  created_at: string
  updated_at: string
}

/**
 * Payload for creating a new note
 */
export interface CreateNote {
  title: string
  content?: string | null
  tags?: string[] | null
  folder_id?: string | null
}

/**
 * Payload for updating a note
 */
export interface UpdateNote {
  folder_id?: string | null
  title?: string
  content?: string
  tags?: string[]
}

// ============================================================================
// Folder Types
// ============================================================================

/**
 * Represents a note folder
 */
export interface NoteFolder {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

/**
 * Payload for creating a new folder
 */
export interface CreateFolder {
  name: string
  color: string
}

/**
 * Payload for updating a folder
 */
export interface UpdateFolder {
  name?: string
  color?: string
}

// ============================================================================
// User Profile Types
// ============================================================================

/**
 * User profile information
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  storage_used_bytes: number
  storage_limit_bytes: number
  created_at: string
  updated_at: string
}

// ============================================================================
// AI/Chat Types
// ============================================================================

/**
 * Message in an AI chat conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

/**
 * Request payload for AI chat
 */
export interface ChatRequest {
  messages: ChatMessage[]
  note_id?: string
  context?: string
}

/**
 * Response from AI chat endpoint
 */
export interface ChatResponse {
  message: ChatMessage
  sources?: string[]
}

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * Vector embedding for semantic search
 */
export interface Embedding {
  id: string
  note_id: string
  chunk_text: string
  embedding: number[]
  chunk_index: number
  created_at: string
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  note_id: string
  note_title: string
  chunk_text: string
  similarity: number
}

/**
 * Request payload for semantic search
 */
export interface SearchRequest {
  query: string
  limit?: number
  min_similarity?: number
}

// ============================================================================
// File Upload Types
// ============================================================================

/**
 * Response from file upload endpoint
 */
export interface UploadResponse {
  note_id: string
  file_path: string
  extracted_text: string
  file_size: number
}

/**
 * File processing status
 */
export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

// ============================================================================
// Assignment Types
// ============================================================================

/**
 * Student assignment/task
 */
export interface Assignment {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

/**
 * Payload for creating an assignment
 */
export interface CreateAssignment {
  title: string
  description?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
}

// ============================================================================
// Study Session Types
// ============================================================================

/**
 * A study session record
 */
export interface StudySession {
  id: string
  user_id: string
  subject: string | null
  duration_minutes: number
  notes_reviewed: string[] | null
  performance_score: number | null
  created_at: string
}

/**
 * Payload for creating a study session
 */
export interface CreateStudySession {
  subject?: string
  duration_minutes: number
  notes_reviewed?: string[]
  performance_score?: number
}

// ============================================================================
// Dashboard/Analytics Types
// ============================================================================

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  total_notes: number
  total_folders: number
  total_study_time: number
  recent_activity: ActivityItem[]
  performance_trend: number[]
  upcoming_assignments: Assignment[]
}

/**
 * Activity item for dashboard
 */
export interface ActivityItem {
  id: string
  type: 'note_created' | 'study_session' | 'assignment_completed'
  title: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  detail: string
  status_code: number
  timestamp?: string
}

// ============================================================================
// Generic API Response Types
// ============================================================================

/**
 * Generic success response
 */
export interface SuccessResponse {
  success: boolean
  message?: string
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}
