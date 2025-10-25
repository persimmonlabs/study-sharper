// src/types/files.ts

export interface FileItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  file_type: 'md' | 'txt';
  created_at: string;
  updated_at: string;
  summary?: string;
  tags?: string[];
  processing_status?: 'completed';
  extraction_method?: 'manual';
}

export interface FileFolder {
  id: string;
  user_id: string;
  parent_folder_id: string | null;
  name: string;
  color: string;
  position?: number;
  depth: number;
  created_at: string;
  updated_at?: string;
}

export interface UserQuota {
  is_premium: boolean;
  daily_uploads: {
    used: number;
    limit: number;
    remaining: number;
  };
  storage: {
    used_bytes: number;
    limit_bytes: number;
    remaining_bytes: number;
    used_mb: number;
    limit_mb: number;
  };
  total_files: number;
  max_file_size_bytes: number;
  max_audio_size_bytes: number;
}

export interface WebSocketMessage {
  type: 'file_update' | 'bulk_update';
  file_id?: string;
  data?: {
    status: string;
    message: string;
  };
  updates?: Array<{
    file_id: string;
    status: string;
    message: string;
  }>;
  timestamp: number;
}

export interface UploadProgress {
  file_id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
}
