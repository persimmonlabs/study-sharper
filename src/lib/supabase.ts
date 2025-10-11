import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables')
}

// Create regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Core authentication settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // flowType removed; default flow works for email/password and avoids edge-cases in dev

    // Storage configuration - let Supabase use default storage
    // Removing custom storage to prevent lock conflicts

    // Session storage key (keep default to avoid conflicts)
    // storageKey: 'sb-project-auth-token',

    // Enable debug during development to surface auth issues
    debug: true,
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'study-sharper-frontend',
    },
  },
})

// SECURITY: No admin client in frontend - service role key should NEVER be in frontend code
// Admin operations should be handled by backend API

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          summary: string | null
          tags: string[] | null
          file_path: string | null
          extracted_text: string | null
          file_size: number | null
          folder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          summary?: string | null
          tags?: string[] | null
          file_path?: string | null
          extracted_text?: string | null
          file_size?: number | null
          folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          summary?: string | null
          tags?: string[] | null
          file_path?: string | null
          extracted_text?: string | null
          file_size?: number | null
          folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      note_folders: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string
          type: 'assignment' | 'test' | 'project'
          status: 'pending' | 'in_progress' | 'completed'
          priority: 'low' | 'medium' | 'high'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date: string
          type: 'assignment' | 'test' | 'project'
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string
          type?: 'assignment' | 'test' | 'project'
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          note_id: string | null
          assignment_id: string | null
          duration_minutes: number
          quality_rating: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note_id?: string | null
          assignment_id?: string | null
          duration_minutes: number
          quality_rating?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          note_id?: string | null
          assignment_id?: string | null
          duration_minutes?: number
          quality_rating?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      audio_transcriptions: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          transcription: string | null
          summary: string | null
          duration_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url: string
          transcription?: string | null
          summary?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_url?: string
          transcription?: string | null
          summary?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      note_embeddings: {
        Row: {
          id: string
          note_id: string
          user_id: string
          embedding: string // JSON stringified array of numbers
          content_hash: string | null
          model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          embedding: string
          content_hash?: string | null
          model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          embedding?: string
          content_hash?: string | null
          model?: string
          created_at?: string
          updated_at?: string
        }
      }
      embedding_queue: {
        Row: {
          id: string
          note_id: string
          user_id: string
          priority: number
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          priority?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          priority?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_similar_notes: {
        Args: {
          query_embedding: string
          user_id_param: string
          match_threshold?: number
          match_count?: number
        }
        Returns: Array<{
          note_id: string
          title: string
          content: string
          summary: string | null
          similarity: number
        }>
      }
      find_related_notes: {
        Args: {
          source_note_id: string
          match_count?: number
        }
        Returns: Array<{
          note_id: string
          title: string
          summary: string | null
          similarity: number
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
