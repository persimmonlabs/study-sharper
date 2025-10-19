// src/lib/api/filesApi.ts

import { FileItem, FileFolder, UserQuota } from '@/types/files';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get auth token from Supabase
async function getAuthToken(): Promise<string> {
  // Try to get token from Supabase session
  if (typeof window === 'undefined') {
    throw new Error('Cannot get auth token on server side');
  }

  // Check localStorage for Supabase session
  const keys = Object.keys(localStorage);
  const supabaseKey = keys.find(key => key.startsWith('sb-') && key.includes('-auth-token'));

  if (supabaseKey) {
    const sessionData = localStorage.getItem(supabaseKey);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.access_token) {
          return parsed.access_token;
        }
      } catch (e) {
        console.error('Failed to parse Supabase token:', e);
      }
    }
  }

  throw new Error('Not authenticated - please log in');
}

// Files API
export async function fetchFiles(folderId?: string | null): Promise<FileItem[]> {
  const token = await getAuthToken();
  const url = new URL(`${API_BASE_URL}/api/files`);
  if (folderId) url.searchParams.set('folder_id', folderId);
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch files');
  
  const data = await response.json();
  return data.files;
}

export async function fetchFile(fileId: string): Promise<FileItem> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch file');
  return response.json();
}

export async function updateFile(fileId: string, updates: Partial<FileItem>): Promise<FileItem> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) throw new Error('Failed to update file');
  return response.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to delete file');
}

export async function retryFileProcessing(fileId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/retry`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to retry processing');
}

export async function uploadYoutubeTranscript(
  url: string,
  title?: string,
  folderId?: string
): Promise<FileItem> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('url', url);
  if (title) formData.append('title', title);
  if (folderId) formData.append('folder_id', folderId);
  
  const response = await fetch(`${API_BASE_URL}/api/upload-youtube`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'YouTube upload failed');
  }
  
  const data = await response.json();
  return data.file;
}

// Folders API
export async function fetchFolders(): Promise<FileFolder[]> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/folders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch folders');
  
  const data = await response.json();
  return data.folders;
}

export async function createFolder(name: string, color: string, parentFolderId?: string): Promise<FileFolder> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/folders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, color, parent_folder_id: parentFolderId })
  });
  
  if (!response.ok) throw new Error('Failed to create folder');
  return response.json();
}

export async function updateFolder(folderId: string, updates: { name?: string; color?: string }): Promise<FileFolder> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) throw new Error('Failed to update folder');
  return response.json();
}

export async function deleteFolder(folderId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to delete folder');
}

// Upload API
export async function uploadFile(
  file: File,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<FileItem> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folder_id', folderId);
  
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }
  
  const data = await response.json();
  return data.file;
}

// Quota API
export async function fetchQuota(): Promise<UserQuota> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/quota`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch quota');
  return response.json();
}
