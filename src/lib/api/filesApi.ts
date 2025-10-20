// src/lib/api/filesApi.ts

import { FileItem, FileFolder, UserQuota } from '@/types/files';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://study-sharper-backend.onrender.com';

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
    
    const response = await fetch(url.toString(), {
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
  try {
    const token = await getAuthToken();
    
    console.log('[filesApi] Fetching folders from:', `${API_BASE_URL}/api/folders`);
    
    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[filesApi] Fetch folders failed:', response.status, errorText);
      throw new Error(`Failed to fetch folders: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[filesApi] Folders fetched successfully:', data.folders?.length || 0);
    return data.folders || [];
  } catch (error) {
    console.error('[filesApi] fetchFolders error:', error);
    throw error;
  }
}

export async function createFolder(name: string, color: string, parentFolderId?: string): Promise<FileFolder> {
  const token = await getAuthToken();
  
  console.log('[filesApi] Creating folder:', { name, color, parentFolderId });
  
  const response = await fetch(`${API_BASE_URL}/api/folders`, {
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

export async function createMarkdownFile(
  title: string,
  content: string,
  folderId?: string
): Promise<FileItem> {
  const token = await getAuthToken();
  
  console.log('[filesApi] Creating markdown file:', { title, folderId, contentLength: content.length });

  const response = await fetch(`${API_BASE_URL}/api/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      file_type: 'md',
      content,
      folder_id: folderId ?? undefined
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
    console.error('[filesApi] Create markdown file failed:', response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[filesApi] Markdown file created successfully:', data);
  
  // Backend returns the file directly, not wrapped
  return data;
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

export interface FolderStructure {
  folders: string[];
  files: Array<{
    index: number;
    folder_path: string;
    title: string;
  }>;
}

export async function uploadFolder(
  files: File[],
  structure: FolderStructure,
  parentFolderId?: string
): Promise<{ success: boolean; message: string }> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('structure', JSON.stringify(structure));
  if (parentFolderId) formData.append('parent_folder_id', parentFolderId);
  
  files.forEach((file, index) => {
    formData.append(`file_${index}`, file);
  });
  
  const response = await fetch(`${API_BASE_URL}/api/upload-folder`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Folder upload failed');
  }
  
  return response.json();
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
