'use client';

import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { Plus, Folder, FolderOpen, FolderPlus, FilePlus, ChevronRight, ChevronDown, Upload } from 'lucide-react';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { UploadDialog } from '@/components/files/UploadDialog';
import { FileContextMenu } from '@/components/files/FileContextMenu';
import { FolderContextMenu } from '@/components/files/FolderContextMenu';
import { FileErrorBoundary } from '@/components/files/FileErrorBoundary';
import { FileEditor } from '@/components/files/FileEditor';
import { FileViewer } from '@/components/files/FileViewer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fetchFile, fetchFiles, fetchFolders, deleteFile } from '@/lib/api/filesApi';

export default function FilesPage() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loadingSelectedFile, setLoadingSelectedFile] = useState(false);
  const [selectedFileError, setSelectedFileError] = useState<string | null>(null);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const newMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem;
    position: { x: number; y: number };
  } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: FileFolder;
    position: { x: number; y: number };
  } | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<FileItem | null>(null);

  const folderColorClasses = useMemo(
    () => ({
      blue: '#3b82f6',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      purple: '#a855f7',
      pink: '#ec4899',
    }),
    []
  );

  const filesWithoutFolder = useMemo(
    () => files.filter((file) => !file.folder_id && file.processing_status !== 'processing'),
    [files]
  );

  const processingFiles = useMemo(
    () => files.filter((file) => file.processing_status === 'processing'),
    [files]
  );

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const data = await fetchFolders();
        setFolders(data);
      } catch (error) {
        console.error('[FilesPage] Failed to load folders:', error);
      }
    };
    loadFolders();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
    };

    if (isNewMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNewMenuOpen]);

  useEffect(() => {
    if (!savingMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSavingMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [savingMessage]);

  const loadFiles = useCallback(async (nextSelectedId?: string | null) => {
    setLoadingFiles(true);
    setFileError(null);
    try {
      const data = await fetchFiles();
      setFiles(data);
      setSelectedFileError(null);
      setSelectedFileId((previous) => {
        // Filter to only completed files for selection
        const completedFiles = data.filter((file) => file.processing_status !== 'processing');
        
        if (nextSelectedId && completedFiles.some((file) => file.id === nextSelectedId)) {
          return nextSelectedId;
        }

        if (!completedFiles.length) {
          return null;
        }

        if (previous && completedFiles.some((file) => file.id === previous)) {
          return previous;
        }

        return completedFiles[0].id;
      });
    } catch (error) {
      console.error('[FilesPage] Failed to load files:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Auto-refresh when there are processing files
  useEffect(() => {
    if (processingFiles.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      loadFiles();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [processingFiles.length, loadFiles]);

  const handleFileCreated = useCallback(
    (note: FileItem) => {
      setShowCreateNote(false);
      setIsEditMode(false);
      setSavingMessage(null);
      setSelectedFileError(null);
      setSelectedFile(note);
      setSelectedFileId(note.id);
      loadFiles(note.id);
    },
    [loadFiles]
  );

  const handleUploadSuccess = useCallback(
    (fileId: string) => {
      setShowUploadDialog(false);
      setSavingMessage('File uploaded and processed successfully!');
      loadFiles(fileId);
    },
    [loadFiles]
  );

  useEffect(() => {
    const fetchSelectedFile = async (fileId: string) => {
      setLoadingSelectedFile(true);
      setSelectedFileError(null);
      setSavingMessage(null);
      try {
        const file = await fetchFile(fileId);
        setSelectedFile(file);
      } catch (error) {
        console.error('[FilesPage] Failed to load selected file:', error);
        setSelectedFile(null);
        setSelectedFileError(error instanceof Error ? error.message : 'Failed to load file');
      } finally {
        setLoadingSelectedFile(false);
      }
    };

    if (!selectedFileId) {
      setSelectedFile(null);
      setSelectedFileError(null);
      return;
    }

    fetchSelectedFile(selectedFileId);
  }, [selectedFileId]);

  const handleFileSaved = useCallback(
    (updatedFile: FileItem) => {
      setSelectedFile(updatedFile);
      setSavingMessage('Changes saved successfully.');
      setIsEditMode(false);
      setFiles((previous) =>
        previous.map((file) =>
          file.id === updatedFile.id
            ? {
                ...file,
                title: updatedFile.title,
                content: updatedFile.content,
                updated_at: updatedFile.updated_at,
              }
            : file
        )
      );
    },
    []
  );

  const handleEditClick = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const closeFolderContextMenu = useCallback(() => {
    setFolderContextMenu(null);
  }, []);

  const handleFileContextMenu = useCallback(
    (event: ReactMouseEvent, file: FileItem) => {
      event.preventDefault();
      setContextMenu({
        file,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  const handleFolderContextMenu = useCallback(
    (event: ReactMouseEvent, folder: FileFolder) => {
      event.preventDefault();
      setFolderContextMenu({
        folder,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  const handleFileDeleted = useCallback(
    (fileId: string) => {
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setSelectedFile(null);
        setIsEditMode(false);
      }
      void loadFiles();
    },
    [selectedFileId, loadFiles]
  );

  const handleFileUpdated = useCallback(
    (updatedFile: FileItem) => {
      setFiles((prev) =>
        prev.map((file) => (file.id === updatedFile.id ? { ...file, ...updatedFile } : file))
      );
      if (selectedFileId === updatedFile.id) {
        setSelectedFile(updatedFile);
      }
    },
    [selectedFileId]
  );

  const requestFileDelete = useCallback(
    (file: FileItem) => {
      setConfirmDeleteFile(file);
      closeContextMenu();
    },
    [closeContextMenu]
  );

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmDeleteFile) {
      return;
    }

    const fileId = confirmDeleteFile.id;
    setDeletingFileId(fileId);
    try {
      await deleteFile(fileId);
      handleFileDeleted(fileId);
      setSavingMessage('File deleted successfully.');
    } catch (error) {
      console.error('[FilesPage] Failed to delete file:', error);
      setSavingMessage('Failed to delete file. Please try again.');
    } finally {
      setDeletingFileId(null);
      setConfirmDeleteFile(null);
    }
  }, [confirmDeleteFile, handleFileDeleted]);

  const handleDeleteCancelled = useCallback(() => {
    setConfirmDeleteFile(null);
  }, []);

  const handleFolderCreated = useCallback(
    (folder: FileFolder) => {
      setShowCreateFolder(false);
      setFolders((prev) => [...prev, folder]);
    },
    []
  );

  const handleFolderUpdated = useCallback(
    (updatedFolder: FileFolder) => {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === updatedFolder.id ? { ...folder, ...updatedFolder } : folder
        )
      );
      closeFolderContextMenu();
    },
    [closeFolderContextMenu]
  );

  const handleFolderDeleted = useCallback(
    (folderId: string) => {
      const collectFolderIds = (targetId: string, allFolders: FileFolder[], collected = new Set<string>()) => {
        if (collected.has(targetId)) {
          return collected;
        }

        collected.add(targetId);

        for (const folder of allFolders) {
          if (folder.parent_folder_id === targetId) {
            collectFolderIds(folder.id, allFolders, collected);
          }
        }

        return collected;
      };

      const foldersToRemove = Array.from(collectFolderIds(folderId, folders));

      setFolders((prev) => prev.filter((folder) => !foldersToRemove.includes(folder.id)));
      setExpandedFolders((prev) => prev.filter((id) => !foldersToRemove.includes(id)));

      setFiles((prev) => {
        if (!foldersToRemove.length) {
          return prev;
        }

        const remaining: FileItem[] = [];
        const movedToRoot: FileItem[] = [];

        prev.forEach((file) => {
          if (file.folder_id && foldersToRemove.includes(file.folder_id)) {
            movedToRoot.push({ ...file, folder_id: null });
          } else {
            remaining.push(file);
          }
        });

        if (!movedToRoot.length) {
          return prev;
        }

        return [...remaining, ...movedToRoot];
      });

      setSelectedFile((prev) => {
        if (prev && prev.folder_id && foldersToRemove.includes(prev.folder_id)) {
          return { ...prev, folder_id: null };
        }
        return prev;
      });

      closeFolderContextMenu();
    },
    [folders, closeFolderContextMenu]
  );

  return (
    <FileErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse your uploaded files from the sidebar and create new study notes anytime.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => setShowUploadDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <button
              onClick={() => setShowCreateNote(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
          {/* File Navigation */}
          <aside className="md:w-56 lg:w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-full flex flex-col shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">File Explorer</h2>
              <div className="relative" ref={newMenuRef}>
                <button
                  onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
                {isNewMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        setShowCreateNote(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg"
                    >
                      <FilePlus className="w-4 h-4" />
                      New File
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateFolder(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      New Folder
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadDialog(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 last:rounded-b-lg"
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingFiles ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : fileError ? (
                <div className="p-4 text-sm text-red-500">
                  {fileError}
                </div>
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No files yet. Create your first note or upload a file to get started.
                </div>
              ) : (
                <nav className="p-2 space-y-1">
                  {/* Root folders only */}
                  {folders
                    .filter((f) => !f.parent_folder_id)
                    .map((folder) => {
                      const isExpanded = expandedFolders.includes(folder.id);
                      const subfolders = folders.filter((f) => f.parent_folder_id === folder.id);
                      const folderFiles = files.filter((f) => f.folder_id === folder.id);

                      const toggleFolder = () => {
                        setExpandedFolders((prev) =>
                          isExpanded ? prev.filter((id) => id !== folder.id) : [...prev, folder.id]
                        );
                      };

                      return (
                        <div key={folder.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={toggleFolder}
                            onContextMenu={(event) => handleFolderContextMenu(event, folder)}
                            className="w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                            {isExpanded ? (
                              <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: folderColorClasses[folder.color as keyof typeof folderColorClasses] || '#3b82f6' }} />
                            ) : (
                              <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folderColorClasses[folder.color as keyof typeof folderColorClasses] || '#3b82f6' }} />
                            )}
                            <span className="text-sm font-semibold truncate">{folder.name}</span>
                          </button>

                          {isExpanded && (
                            <div className="space-y-1">
                              {/* Subfolders */}
                              {subfolders.map((subfolder) => {
                                const isSubExpanded = expandedFolders.includes(subfolder.id);
                                const subfolderFiles = files.filter((f) => f.folder_id === subfolder.id);

                                const toggleSubfolder = () => {
                                  setExpandedFolders((prev) =>
                                    isSubExpanded ? prev.filter((id) => id !== subfolder.id) : [...prev, subfolder.id]
                                  );
                                };

                                return (
                                  <div key={subfolder.id} className="space-y-1">
                                    <button
                                      type="button"
                                      onClick={toggleSubfolder}
                                      onContextMenu={(event) => handleFolderContextMenu(event, subfolder)}
                                      className="text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden"
                                      style={{ marginLeft: '24px', width: 'calc(100% - 24px)' }}
                                    >
                                      {isSubExpanded ? (
                                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                      )}
                                      {isSubExpanded ? (
                                        <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: folderColorClasses[subfolder.color as keyof typeof folderColorClasses] || '#3b82f6' }} />
                                      ) : (
                                        <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folderColorClasses[subfolder.color as keyof typeof folderColorClasses] || '#3b82f6' }} />
                                      )}
                                      <span className="text-sm font-semibold truncate">{subfolder.name}</span>
                                    </button>

                                    {isSubExpanded && subfolderFiles.length > 0 && (
                                      <div className="space-y-1">
                                        {subfolderFiles.map((file) => {
                                          const isActive = file.id === selectedFileId;
                                          return (
                                            <button
                                              key={file.id}
                                              onClick={() => {
                                                setIsEditMode(false);
                                                setSavingMessage(null);
                                                setSelectedFile(null);
                                                setSelectedFileError(null);
                                                setSelectedFileId(file.id);
                                                closeContextMenu();
                                              }}
                                              onContextMenu={(event) => handleFileContextMenu(event, file)}
                                              className={`text-left px-3 py-2 rounded-lg transition border border-transparent overflow-hidden ${
                                                isActive
                                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200 border-blue-100 dark:border-blue-400/40'
                                                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                                              }`}
                                              style={{ marginLeft: '48px', width: 'calc(100% - 48px)' }}
                                            >
                                              <span className="block text-sm font-semibold truncate">
                                                {file.title || 'Untitled note'}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Files in root folder */}
                              {folderFiles.length > 0 && (
                                <div className="space-y-1">
                                  {folderFiles.map((file) => {
                                    const isActive = file.id === selectedFileId;
                                    return (
                                      <button
                                        key={file.id}
                                        onClick={() => {
                                          setIsEditMode(false);
                                          setSavingMessage(null);
                                          setSelectedFile(null);
                                          setSelectedFileError(null);
                                          setSelectedFileId(file.id);
                                          closeContextMenu();
                                        }}
                                        onContextMenu={(event) => handleFileContextMenu(event, file)}
                                        className={`text-left px-3 py-2 rounded-lg transition border border-transparent overflow-hidden ${
                                          isActive
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200 border-blue-100 dark:border-blue-400/40'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                                        }`}
                                        style={{ marginLeft: '24px', width: 'calc(100% - 24px)' }}
                                      >
                                        <span className="block text-sm font-semibold truncate">
                                          {file.title || 'Untitled note'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Processing files */}
                  {processingFiles.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">
                        Processing
                      </div>
                      {processingFiles.map((file) => (
                        <div
                          key={file.id}
                          className="w-full text-left px-3 py-3 rounded-lg transition border border-transparent overflow-hidden bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            <span className="block text-sm font-semibold truncate">
                              {file.title || 'Untitled note'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unfiled files */}
                  {filesWithoutFolder.length > 0 && (
                    <div>
                      {(folders.length > 0 || processingFiles.length > 0) && (
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">
                          Files
                        </div>
                      )}
                      {filesWithoutFolder.map((file) => {
                        const isActive = file.id === selectedFileId;
                        return (
                          <button
                            key={file.id}
                            onClick={() => {
                              setIsEditMode(false);
                              setSavingMessage(null);
                              setSelectedFile(null);
                              setSelectedFileError(null);
                              setSelectedFileId(file.id);
                              closeContextMenu();
                            }}
                            onContextMenu={(event) => handleFileContextMenu(event, file)}
                            className={`w-full text-left px-3 py-3 rounded-lg transition border border-transparent overflow-hidden ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200 border-blue-100 dark:border-blue-400/40'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <span className="block text-sm font-semibold truncate">
                              {file.title || 'Untitled note'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </nav>
              )}
            </div>
          </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 flex flex-col">
          {savingMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
              {savingMessage}
            </div>
          )}

          {loadingFiles && files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Loading files...
            </div>
          ) : fileError ? (
            <div className="flex-1 flex items-center justify-center text-red-500">
              {fileError}
            </div>
          ) : selectedFileId && loadingSelectedFile ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Loading file content...
            </div>
          ) : selectedFileError ? (
            <div className="flex-1 flex items-center justify-center text-red-500">
              {selectedFileError}
            </div>
          ) : selectedFile ? (
            <div className="flex-1">
              {isEditMode ? (
                <FileEditor
                  file={selectedFile}
                  onSaved={handleFileSaved}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <FileViewer
                  file={selectedFile}
                  onEditClick={handleEditClick}
                  onDeleteClick={() => requestFileDelete(selectedFile)}
                  isDeleting={deletingFileId === selectedFile.id}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a file from the sidebar to view it.
            </div>
          )}
        </main>
      </div>
    </div>

      {/* Create Note Dialog */}
      <CreateNoteDialog
        isOpen={showCreateNote}
        onClose={() => setShowCreateNote(false)}
        parentFolders={folders}
        defaultFolderId={null}
        onCreated={handleFileCreated}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        parentFolders={folders}
        defaultParentId={null}
        onCreated={handleFolderCreated}
      />

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {contextMenu && (
        <FileContextMenu
          file={contextMenu.file}
          position={contextMenu.position}
          folders={folders}
          onClose={closeContextMenu}
          onFileUpdated={handleFileUpdated}
          onDeleteRequested={(file) => {
            requestFileDelete(file);
          }}
        />
      )}

      {folderContextMenu && (
        <FolderContextMenu
          folder={folderContextMenu.folder}
          position={folderContextMenu.position}
          allFolders={folders}
          parentFolders={folders}
          onClose={closeFolderContextMenu}
          onFolderUpdated={handleFolderUpdated}
          onFolderDeleted={handleFolderDeleted}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteFile}
        title="Delete File"
        message={`Are you sure you want to delete "${confirmDeleteFile?.title || 'this file'}"? This action cannot be undone.`}
        confirmText={deletingFileId ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={() => {
          void handleDeleteConfirmed();
        }}
        onCancel={handleDeleteCancelled}
        isDestructive
      />
    </FileErrorBoundary>
  );
}