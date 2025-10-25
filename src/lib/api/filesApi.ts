// src/lib/api/filesApi.ts

import { FileItem, FileFolder, UserQuota } from '@/types/files';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://study-sharper-backend-production.up.railway.app';

// Retry helper for handling cold starts and transient errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[fetchWithRetry] Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);
      
      const response = await fetch(url, options);
      
      // If we get a 502/503/504 (backend cold start), retry
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`[fetchWithRetry] Got ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other responses (including errors), return immediately
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Network errors (CORS, connection refused) - retry
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[fetchWithRetry] Network error, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Request failed after retries');
}

// Helper to get auth token from Supabase
async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[filesApi] Session error:', error);
    throw new Error('Authentication error');
  }
  
  if (!session?.access_token) {
    throw new Error('Not authenticated - please log in');
  }
  
  return session.access_token;
}

// Files API
export async function fetchFiles(folderId?: string | null): Promise<FileItem[]> {
  try {
    const token = await getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/files`);
    if (folderId) url.searchParams.set('folder_id', folderId);
    
    console.log('[filesApi] Fetching files from:', url.toString());
    
    const response = await fetchWithRetry(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[filesApi] Fetch files failed:', response.status, errorText);
      throw new Error(`Failed to fetch files: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[filesApi] Files fetched successfully:', data.files?.length || 0);
    return data.files || [];
  } catch (error) {
    console.error('[filesApi] fetchFiles error:', error);
    throw error;
  }
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

// Folders API
export async function fetchFolders(): Promise<FileFolder[]> {
  try {
    const token = await getAuthToken();
    
    console.log('[filesApi] Fetching folders from:', `${API_BASE_URL}/api/folders`);
    
    const response = await fetchWithRetry(`${API_BASE_URL}/api/folders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[filesApi] Fetch folders failed:', response.status, errorText);
      throw new Error(`Failed to fetch folders: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[filesApi] 📦 Raw response data:', data);
    
    // Backend returns raw array, not {folders: [...]}
    const folders = Array.isArray(data) ? data : (data.folders || []);
    console.log('[filesApi] ✅ Folders fetched successfully:', folders.length);
    console.log('[filesApi] 📤 Returning folders array:', folders);
    return folders;
  } catch (error) {
    console.error('[filesApi] fetchFolders error:', error);
    throw error;
  }
}

export async function createFolder(name: string, color: string, parentFolderId?: string): Promise<FileFolder> {
  const token = await getAuthToken();
  
  console.log('[filesApi] Creating folder:', { name, color, parentFolderId });
  
  const response = await fetchWithRetry(`${API_BASE_URL}/api/folders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, color, parent_folder_id: parentFolderId })
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to create folder: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = `Failed to create folder: ${response.statusText}`;
    }
    console.error('[filesApi] Create folder failed:', response.status, errorMessage);
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('[filesApi] Folder created successfully:', data);
  return data;
}

export async function createNote(
  title: string,
  content: string,
  folderId?: string
): Promise<FileItem> {
  const token = await getAuthToken();
  
  console.log('[filesApi] Creating note:', { title, folderId, contentLength: content.length });

  const response = await fetchWithRetry(`${API_BASE_URL}/api/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      content,
      folder_id: folderId,
      file_type: 'md'
    })
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create note';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = `Failed to create note: ${response.statusText}`;
    }
    console.error('[filesApi] Create note failed:', response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[filesApi] Note created successfully:', data);
  return data;
}

// Backward compatibility alias
export const createMarkdownFile = createNote;

export async function updateFolder(folderId: string, updates: { name?: string; color?: string; parent_folder_id?: string | null }): Promise<FileFolder> {
  const token = await getAuthToken()
  
  const response = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })
  
  if (!response.ok) throw new Error('Failed to update folder')
  return response.json()
}

export async function deleteFolder(folderId: string): Promise<void> {
  const token = await getAuthToken()
  
  const response = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (!response.ok) throw new Error('Failed to delete folder')
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
