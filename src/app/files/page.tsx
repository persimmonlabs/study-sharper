// src/app/files/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileItem, FileFolder, UploadProgress } from '@/types/files';
import {
  fetchFiles,
  fetchFolders,
  deleteFile,
  deleteFolder,
  uploadFile,
  retryFileProcessing
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
  MoreVertical
} from 'lucide-react';

export default function FilesPage() {
  // State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [showAiChat, setShowAiChat] = useState(false);

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
    
    for (const file of filesArray) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
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

        // Add to files list
        setFiles(prev => [uploadedFile, ...prev]);
      } catch (err) {
        setUploadProgress(prev => prev.map(p =>
          p.file_id === tempId
            ? { ...p, status: 'failed', message: err instanceof Error ? err.message : 'Upload failed' }
            : p
        ));
      }
    }
  };

  // Handle file delete
  const handleDeleteFile = async (fileId: string) => {
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
  };

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

  // Filter files by search
  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Files</h1>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
            <Upload className="w-4 h-4" />
            Upload Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
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
              <button className="p-1 hover:bg-gray-100 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {folders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No folders yet</p>
            ) : (
              <div className="space-y-1">
                {folders.map(folder => (
                  <div key={folder.id}>
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                        selectedFolderId === folder.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Folder className="w-4 h-4" style={{ color: folder.color }} />
                      <span className="flex-1 text-left text-sm truncate">{folder.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main viewer area */}
        <main className="flex-1 flex flex-col overflow-hidden">
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
          ) : selectedFile ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">{selectedFile.title}</h2>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedFile.content ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg">
                      {selectedFile.content}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
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
                      className={`border rounded-lg p-4 hover:shadow-md transition cursor-pointer ${
                        file.processing_status === 'pending' || file.processing_status === 'processing'
                          ? 'opacity-50 cursor-wait'
                          : file.processing_status === 'failed'
                          ? 'border-red-300 bg-red-50'
                          : 'bg-white'
                      }`}
                      onClick={() => file.processing_status === 'completed' && setSelectedFile(file)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.file_type)}
                          <span className="text-xs text-gray-500 uppercase">{file.file_type}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {file.processing_status === 'failed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(file.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Retry"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-medium mb-1 truncate">{file.title}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{file.original_filename}</p>
                      
                      {getStatusBadge(file)}

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

      {/* AI Chat overlay (placeholder) */}
      {showAiChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">AI Assistant</h3>
            <button
              onClick={() => setShowAiChat(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <p className="text-gray-500 text-center">AI chat coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
