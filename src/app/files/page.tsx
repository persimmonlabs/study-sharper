// src/app/files/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FileItem, FileFolder, UploadProgress } from '@/types/files';
import {
  fetchFiles,
  fetchFolders,
  deleteFile,
  deleteFolder,
  uploadFile,
  uploadFolder,
  retryFileProcessing,
  type FolderStructure
} from '@/lib/api/filesApi';
import { useFileWebSocket } from '@/hooks/useFileWebSocket';
import { 
  FileText, 
  Folder, 
  Upload, 
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  MessageSquare,
  X,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  FileEdit,
  Mic,
  Youtube,
  Sparkles
} from 'lucide-react';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
import { AudioRecorder } from '@/components/files/AudioRecorder';
import { YouTubeDialog } from '@/components/files/YouTubeDialog';
import { FileEditor } from '@/components/files/FileEditor';
import { FolderContextMenu } from '@/components/files/FolderContextMenu';
import { FileContextMenu } from '@/components/files/FileContextMenu';
import { FileErrorBoundary } from '@/components/files/FileErrorBoundary';
import { AIChatPanel } from '@/components/files/AIChatPanel';

export default function FilesPage() {
  // State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
  const [semanticResults, setSemanticResults] = useState<Array<{ file_id: string; similarity: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [showAiChat, setShowAiChat] = useState(false);
  
  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  
  // Context menu states
  const [folderContextMenu, setFolderContextMenu] = useState<{ folder: FileFolder; x: number; y: number } | null>(null);
  const [fileContextMenu, setFileContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  
  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [filesData, foldersData] = await Promise.all([
        fetchFiles(selectedFolderId),
        fetchFolders()
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Escape to work even in inputs
        if (e.key !== 'Escape') {
          return;
        }
      }

      // Ctrl/Cmd + N: Create new note
      if (modKey && e.key === 'n') {
        e.preventDefault();
        setShowCreateNote(true);
      }

      // Ctrl/Cmd + U: Open upload dialog
      if (modKey && e.key === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }

      // Ctrl/Cmd + F: Focus search
      if (modKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl/Cmd + K: Open AI chat
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setShowAiChat(prev => !prev);
      }

      // Delete: Delete selected file
      if (e.key === 'Delete' && selectedFile) {
        e.preventDefault();
        handleDeleteFile(selectedFile.id);
      }

      // Escape: Close dialogs/deselect file
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Close dialogs first
        if (showCreateFolder) {
          setShowCreateFolder(false);
        } else if (showCreateNote) {
          setShowCreateNote(false);
        } else if (showYouTubeDialog) {
          setShowYouTubeDialog(false);
        } else if (showAudioRecorder) {
          setShowAudioRecorder(false);
        } else if (showAiChat) {
          setShowAiChat(false);
        } else if (selectedFile) {
          // Deselect file if no dialogs open
          setSelectedFile(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFile,
    showCreateFolder,
    showCreateNote,
    showYouTubeDialog,
    showAudioRecorder,
    showAiChat
  ]);

  // WebSocket for real-time updates
  useFileWebSocket({
    onFileUpdate: (fileId, data) => {
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, processing_status: data.status, error_message: data.message }
          : f
      ));

      // Update upload progress
      setUploadProgress(prev => prev.map(p =>
        p.file_id === fileId
          ? { ...p, status: data.status, message: data.message }
          : p
      ));
    },
    enabled: true
  });

  // Handle file upload
  const handleFileUpload = async (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    setIsUploading(true);
    
    for (const file of filesArray) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Optimistic update - add placeholder file immediately
      const optimisticFile: FileItem = {
        id: tempId,
        user_id: '',
        folder_id: selectedFolderId,
        title: file.name,
        original_filename: file.name,
        file_type: file.name.split('.').pop() as any || 'txt',
        file_size_bytes: file.size,
        processing_status: 'pending',
        has_images: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setFiles(prev => [optimisticFile, ...prev]);
      
      // Add to upload progress
      setUploadProgress(prev => [...prev, {
        file_id: tempId,
        filename: file.name,
        progress: 0,
        status: 'uploading'
      }]);

      try {
        const uploadedFile = await uploadFile(file, selectedFolderId || undefined);
        
        // Update progress with real file ID
        setUploadProgress(prev => prev.map(p =>
          p.file_id === tempId
            ? { ...p, file_id: uploadedFile.id, status: 'processing', progress: 100 }
            : p
        ));

        // Replace optimistic file with real data
        setFiles(prev => prev.map(f => f.id === tempId ? uploadedFile : f));
      } catch (err) {
        setUploadProgress(prev => prev.map(p =>
          p.file_id === tempId
            ? { ...p, status: 'failed', message: err instanceof Error ? err.message : 'Upload failed' }
            : p
        ));
        
        // Remove optimistic file on error
        setFiles(prev => prev.filter(f => f.id !== tempId));
      }
    }
    
    setIsUploading(false);
  };

  // Handle folder upload
  const handleFolderUpload = async (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setIsUploading(true);

    // Extract folder structure from webkitRelativePath
    const folderPaths = new Set<string>();
    const fileStructure: FolderStructure['files'] = [];

    filesArray.forEach((file, index) => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      // Build folder hierarchy
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
        folderPaths.add(currentPath);
      }

      // Add file to structure
      const folderPath = pathParts.slice(0, -1).join('/');
      fileStructure.push({
        index,
        folder_path: folderPath,
        title: pathParts[pathParts.length - 1]
      });
    });

    const structure: FolderStructure = {
      folders: Array.from(folderPaths).sort(),
      files: fileStructure
    };

    // Add all files to upload progress
    const progressEntries = filesArray.map(file => ({
      file_id: `temp-folder-${Date.now()}-${Math.random()}`,
      filename: (file as any).webkitRelativePath || file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadProgress(prev => [...prev, ...progressEntries]);

    try {
      await uploadFolder(filesArray, structure, selectedFolderId || undefined);
      
      // Update all to completed
      setUploadProgress(prev => prev.map(p => {
        const isFromThisBatch = progressEntries.some(e => e.file_id === p.file_id);
        return isFromThisBatch
          ? { ...p, status: 'completed', progress: 100 }
          : p;
      }));

      // Refresh data
      await loadData();
    } catch (err) {
      // Mark all as failed
      setUploadProgress(prev => prev.map(p => {
        const isFromThisBatch = progressEntries.some(e => e.file_id === p.file_id);
        return isFromThisBatch
          ? { ...p, status: 'failed', message: err instanceof Error ? err.message : 'Folder upload failed' }
          : p;
      }));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file delete
  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  }, [selectedFile]);

  // Handle retry
  const handleRetry = async (fileId: string) => {
    try {
      await retryFileProcessing(fileId);
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, processing_status: 'pending', error_message: undefined }
          : f
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry');
    }
  };

  // Handle folder created
  const handleFolderCreated = (folder: FileFolder) => {
    setFolders(prev => [...prev, folder]);
  };

  // Handle folder updated
  const handleFolderUpdated = (updated: FileFolder) => {
    setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  // Handle folder deleted
  const handleFolderDeleted = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  // Handle file created
  const handleFileCreated = (file: FileItem) => {
    setFiles(prev => [file, ...prev]);
  };

  // Handle file updated
  const handleFileUpdated = (updated: FileItem) => {
    setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (selectedFile?.id === updated.id) {
      setSelectedFile(updated);
    }
  };

  // Handle file deleted from context menu
  const handleFileDeletedFromMenu = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  // Handle folder context menu
  const handleFolderContextMenu = (e: React.MouseEvent, folder: FileFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ folder, x: e.clientX, y: e.clientY });
  };

  // Handle file context menu
  const handleFileContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setFileContextMenu({ file, x: e.clientX, y: e.clientY });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the main drop zone
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Perform semantic search
  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      setSemanticResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/embeddings/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          query,
          limit: 20,
          threshold: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('Semantic search failed');
      }

      const data = await response.json();
      setSemanticResults(data.results || []);
    } catch (error) {
      console.error('Semantic search error:', error);
      setSemanticResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce semantic search
  useEffect(() => {
    if (searchMode === 'semantic' && searchQuery) {
      const timer = setTimeout(() => {
        performSemanticSearch(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchMode === 'text') {
      setSemanticResults([]);
    }
  }, [searchQuery, searchMode]);

  // Filter files by search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }

    if (searchMode === 'text') {
      return files.filter(file =>
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      // Semantic search: filter by results and sort by similarity
      const resultMap = new Map(semanticResults.map(r => [r.file_id, r.similarity]));
      return files
        .filter(file => resultMap.has(file.id))
        .sort((a, b) => (resultMap.get(b.id) || 0) - (resultMap.get(a.id) || 0));
    }
  }, [files, searchQuery, searchMode, semanticResults]);

  // Get similarity score for a file
  const getSimilarityScore = (fileId: string): number | null => {
    if (searchMode !== 'semantic') return null;
    const result = semanticResults.find(r => r.file_id === fileId);
    return result ? result.similarity : null;
  };

  // Toggle folder collapse
  const toggleFolder = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    return <FileText className="w-4 h-4" />;
  };

  // Get status badge
  const getStatusBadge = (file: FileItem) => {
    if (file.processing_status === 'pending' || file.processing_status === 'processing') {
      return (
        <span className="flex items-center gap-1 text-xs text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing...
        </span>
      );
    }
    if (file.processing_status === 'failed') {
      return (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    return null;
  };

  return (
    <FileErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Files</h1>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchMode === 'semantic' ? 'Semantic search...' : 'Search files...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
            
            {/* Search mode toggle */}
            <div className="flex rounded-lg border border-gray-300 bg-white">
              <button
                onClick={() => setSearchMode('text')}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  searchMode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                } rounded-l-lg`}
              >
                Text
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  searchMode === 'semantic'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                } rounded-r-lg border-l border-gray-300`}
              >
                Semantic
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowCreateNote(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Create Markdown Note"
          >
            <FileEdit className="w-4 h-4" />
            New Note
          </button>

          <button
            onClick={() => setShowYouTubeDialog(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Upload YouTube Transcript"
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>

          <button
            onClick={() => setShowAudioRecorder(!showAudioRecorder)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Record Audio"
          >
            <Mic className="w-4 h-4" />
            Record
          </button>

          {/* Upload buttons */}
          <label className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg transition ${
            isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-gray-50'
          }`}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
            Upload Folder
            <input
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              className="hidden"
              onChange={(e) => !isUploading && e.target.files && handleFolderUpload(e.target.files)}
              disabled={isUploading}
            />
          </label>

          <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg transition ${
            isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-blue-700'
          }`}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Files
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => !isUploading && e.target.files && handleFileUpload(e.target.files)}
              disabled={isUploading}
            />
          </label>

          {/* AI Chat toggle */}
          <button
            onClick={() => setShowAiChat(!showAiChat)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - File explorer */}
        <aside className="w-64 bg-white border-r flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                selectedFolderId === null
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              All Files
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Folders</h3>
              <button 
                className="p-1 hover:bg-gray-100 rounded"
                onClick={() => setShowCreateFolder(true)}
                title="Create Folder"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-2 px-3 py-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="flex-1 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : folders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No folders yet</p>
            ) : (
              <div className="space-y-1">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                        selectedFolderId === folder.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Folder className="w-4 h-4" style={{ color: folder.color }} />
                      <span className="flex-1 text-left text-sm truncate">{folder.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderContextMenu(e, folder);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main viewer area */}
        <main 
          className="flex-1 flex flex-col overflow-hidden relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag and drop overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-40 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-blue-500">
              <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
                <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop files here to upload</h3>
                <p className="text-gray-500">Release to upload files to {selectedFolderId ? 'the selected folder' : 'your library'}</p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
                <button
                  onClick={loadData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="border rounded-lg p-4 bg-white animate-pulse">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                        <div className="w-12 h-3 bg-gray-200 rounded" />
                      </div>
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ) : selectedFile ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>

                {selectedFile.file_type === 'md' && selectedFile.processing_status === 'completed' ? (
                  <FileEditor
                    file={selectedFile}
                    onSaved={handleFileUpdated}
                    onError={(err) => console.error('File save error:', err)}
                  />
                ) : selectedFile.content ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h2 className="text-2xl font-bold mb-4">{selectedFile.title}</h2>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg">
                        {selectedFile.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-gray-400">
                    {selectedFile.processing_status === 'pending' || selectedFile.processing_status === 'processing' ? (
                      <>
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                        <p>Processing file...</p>
                      </>
                    ) : (
                      <p>No content available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              {filteredFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchQuery ? 'No files match your search' : 'No files yet'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFiles.map(file => (
                    <div
                      key={file.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition cursor-pointer group relative ${
                        file.processing_status === 'pending' || file.processing_status === 'processing'
                          ? 'opacity-75 cursor-wait'
                          : file.processing_status === 'failed'
                          ? 'border-red-300 bg-red-50'
                          : 'bg-white'
                      }`}
                      onClick={() => file.processing_status === 'completed' && setSelectedFile(file)}
                      onContextMenu={(e) => handleFileContextMenu(e, file)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {file.processing_status === 'pending' || file.processing_status === 'processing' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            getFileIcon(file.file_type)
                          )}
                          <span className="text-xs text-gray-500 uppercase">{file.file_type}</span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileContextMenu(e, file);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-medium mb-1 truncate">{file.title}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{file.original_filename}</p>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(file)}
                        {getSimilarityScore(file.id) !== null && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                            <Sparkles className="w-3 h-3" />
                            {Math.round(getSimilarityScore(file.id)! * 100)}% match
                          </span>
                        )}
                      </div>

                      {file.error_message && (
                        <p className="text-xs text-red-600 mt-2">{file.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Upload progress bar (bottom) */}
      {uploadProgress.length > 0 && (
        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            {uploadProgress.map(progress => (
              <div key={progress.file_id} className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm truncate">{progress.filename}</span>
                {progress.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
                {progress.status === 'processing' && (
                  <span className="text-xs text-blue-600">Processing...</span>
                )}
                {progress.status === 'completed' && (
                  <span className="text-xs text-green-600">✓ Complete</span>
                )}
                {progress.status === 'failed' && (
                  <span className="text-xs text-red-600">✗ Failed</span>
                )}
                <button
                  onClick={() => setUploadProgress(prev => prev.filter(p => p.file_id !== progress.file_id))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Recorder overlay */}
      {showAudioRecorder && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Audio Recorder</h3>
            <button
              onClick={() => setShowAudioRecorder(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <AudioRecorder
              folderId={selectedFolderId || undefined}
              onUploaded={(file) => {
                handleFileCreated(file);
                setShowAudioRecorder(false);
              }}
              onError={(err) => console.error('Audio upload error:', err)}
            />
          </div>
        </div>
      )}

      {/* AI Chat panel */}
      {showAiChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border overflow-hidden">
          <AIChatPanel
            selectedFile={selectedFile}
            onClose={() => setShowAiChat(false)}
            onFileReference={(fileId) => {
              // Find and select the referenced file
              const file = files.find(f => f.id === fileId)
              if (file) {
                setSelectedFile(file)
              }
            }}
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        parentFolders={folders}
        onCreated={handleFolderCreated}
      />

      <CreateNoteDialog
        isOpen={showCreateNote}
        onClose={() => setShowCreateNote(false)}
        parentFolders={folders}
        defaultFolderId={selectedFolderId}
        onCreated={handleFileCreated}
      />

      <YouTubeDialog
        isOpen={showYouTubeDialog}
        onClose={() => setShowYouTubeDialog(false)}
        parentFolders={folders}
        defaultFolderId={selectedFolderId}
        onUploaded={handleFileCreated}
      />

      {/* Context Menus */}
      {folderContextMenu && (
        <FolderContextMenu
          folder={folderContextMenu.folder}
          position={{ x: folderContextMenu.x, y: folderContextMenu.y }}
          parentFolders={folders}
          onClose={() => setFolderContextMenu(null)}
          onFolderUpdated={handleFolderUpdated}
          onFolderDeleted={handleFolderDeleted}
        />
      )}

      {fileContextMenu && (
        <FileContextMenu
          file={fileContextMenu.file}
          position={{ x: fileContextMenu.x, y: fileContextMenu.y }}
          folders={folders}
          onClose={() => setFileContextMenu(null)}
          onFileUpdated={handleFileUpdated}
          onFileDeleted={handleFileDeletedFromMenu}
          onRetry={handleRetry}
        />
      )}
      </div>
    </FileErrorBoundary>
  );
}
