// src/app/files/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileItem, FileFolder } from '@/types/files';
import {
  fetchFiles,
  fetchFolders,
  deleteFile,
  deleteFolder
} from '@/lib/api/filesApi';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Folder,
  Search,
  Plus,
  AlertCircle,
  Loader2,
  MessageSquare,
  X,
  MoreVertical,
  FileEdit
} from 'lucide-react';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [showAiChat, setShowAiChat] = useState(false);
  const { toast, ToastViewport } = useToast();
  
  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  
  // Context menu states
  const [folderContextMenu, setFolderContextMenu] = useState<{ folder: FileFolder; x: number; y: number } | null>(null);
  const [fileContextMenu, setFileContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const folderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load initial data
  const loadData = useCallback(async () => {
    console.log('[Files Page] 🔄 loadData called, selectedFolderId:', selectedFolderId);
    try {
      setLoading(true);
      setError(null);
      
      // Load files and folders - don't replace state on error
      try {
        console.log('[Files Page] 📁 Fetching files...');
        const filesData = await fetchFiles(selectedFolderId);
        console.log('[Files Page] ✅ Files fetched:', filesData.length, 'files');
        setFiles(filesData);
      } catch (err) {
        console.error('[Files] Failed to load files:', err);
        // Don't replace files state - keep existing files
      }
      
      try {
        console.log('[Files Page] 📂 Fetching folders...');
        const foldersData = await fetchFolders();
        console.log('[Files Page] ✅ Folders fetched:', foldersData.length, 'folders');
        console.log('[Files Page] 📋 Folder data:', foldersData);
        setFolders(foldersData);
        console.log('[Files Page] 💾 Folders state updated');
      } catch (err) {
        console.error('[Files] Failed to load folders:', err);
        // Don't replace folders state - keep existing folders
      }
    } catch (err) {
      console.error('[Files] Critical error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      console.log('[Files Page] ✅ Loading complete');
    }
  }, [selectedFolderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debug: Log folders state changes
  useEffect(() => {
    console.log('[Files Page] 🔍 Folders state changed:', folders.length, 'folders');
    console.log('[Files Page] 🔍 Current folders:', folders);
  }, [folders]);

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
    showAiChat,
    handleDeleteFile
  ]);

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

  // Filter files by search (text only)
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }
    return files.filter(file =>
      file.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

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
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'txt':
      case 'md':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (file: FileItem) => {
    // All manual notes are completed
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300 px-2 py-1 text-xs font-medium">
        ✓ Completed
      </span>
    );
  };

  return (
    <FileErrorBoundary>
      <ToastViewport />
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Action buttons */}
            <button
              onClick={() => setShowCreateNote(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Create Markdown Note"
            >
              <FileEdit className="w-4 h-4" />
              New Note
            </button>

            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Create Folder"
            >
              <Plus className="w-4 h-4" />
              New Folder
            </button>

            {/* AI Chat toggle */}
            <button
              onClick={() => setShowAiChat(!showAiChat)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - File explorer */}
          <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedFolderId === null
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                All Files
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Folders</h3>
                <button 
                  className="p-1 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
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
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No folders yet</p>
              ) : (
                <div className="space-y-1">
                  {folders.map(folder => (
                    <div 
                      key={folder.id} 
                      className="relative group"
                      ref={el => { folderRefs.current[folder.id] = el; }}
                    >
                      <button
                        onClick={() => setSelectedFolderId(folder.id)}
                        onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                          selectedFolderId === folder.id
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Folder className="w-4 h-4" style={{ color: folder.color }} />
                        <span className="flex-1 text-left text-sm truncate">{folder.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderContextMenu(e, folder);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
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
          <main className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-600" />
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : selectedFile ? (
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                      Close
                    </button>
                  </div>

                  {selectedFile.file_type === 'md' ? (
                    <FileEditor
                      file={selectedFile}
                      onSaved={handleFileUpdated}
                      onError={(err) => console.error('File save error:', err)}
                      onAskAboutFile={(file) => {
                        setShowAiChat(true)
                        setSelectedFile(file)
                      }}
                    />
                  ) : selectedFile.content ? (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{selectedFile.title}</h2>
                      <div className="prose max-w-none text-gray-700 dark:text-gray-200">
                        <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 p-6 rounded-lg">
                          {selectedFile.content}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400 dark:text-gray-500">
                      <p>No content available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-6">
                {filteredFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No files match your search' : 'No files yet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        ref={el => { fileRefs.current[file.id] = el; }}
                        className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10 transition cursor-pointer group relative bg-white dark:bg-gray-900"
                        onClick={() => setSelectedFile(file)}
                        onContextMenu={(e) => handleFileContextMenu(e, file)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.file_type)}
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{file.file_type}</span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileContextMenu(e, file);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="font-medium mb-1 truncate text-gray-900 dark:text-gray-100">{file.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(file)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* AI Chat panel */}
        {showAiChat && (
          <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
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
          />
        )}
      </div>
    </FileErrorBoundary>
  );
}
