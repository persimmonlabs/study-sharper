'use client';

import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { Plus, Folder, FolderOpen, FolderPlus, FilePlus, ChevronRight, ChevronDown, Upload, X } from 'lucide-react';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { UploadDialog } from '@/components/files/UploadDialog';
import { FileContextMenu } from '@/components/files/FileContextMenu';
import { FolderContextMenu } from '@/components/files/FolderContextMenu';
import { FileErrorBoundary } from '@/components/files/FileErrorBoundary';
import { FileEditor } from '@/components/files/FileEditor';
import { FileViewer } from '@/components/files/FileViewer';
import { FileChatInterface } from '@/components/chat/FileChatInterface';
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
    () => files.filter((file) => !file.folder_id),
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
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Condensed Header */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 m-4 mb-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Files</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your uploads, edit content, and chat with your notes in one view.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadDialog(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
            <button
              onClick={() => setShowCreateNote(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Create Note
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-4 pt-4">
          <div className="grid h-full min-h-0 gap-4 grid-cols-1 lg:grid-cols-[260px_1fr_360px]">
            {/* File Explorer Panel */}
            <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">File Explorer</h2>
                <div className="relative" ref={newMenuRef}>
                  <button
                    onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </button>
                  {isNewMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-10">
                      <button
                        onClick={() => {
                          setShowCreateNote(true);
                          setIsNewMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition first:rounded-t-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <FilePlus className="h-4 w-4" />
                        New File
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateFolder(true);
                          setIsNewMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <FolderPlus className="h-4 w-4" />
                        New Folder
                      </button>
                      <button
                        onClick={() => {
                          setShowUploadDialog(true);
                          setIsNewMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition last:rounded-b-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Upload className="h-4 w-4" />
                        Upload File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingFiles ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
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
                  <nav className="space-y-1 p-2">
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
                              className="flex w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
                              <span className="truncate">{folder.name}</span>
                            </button>

                            {isExpanded && (
                              <div className="space-y-1">
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
                                        className="flex w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
                                        <span className="truncate">{subfolder.name}</span>
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
                                                className={`overflow-hidden rounded-lg border border-transparent px-3 py-2 text-left text-sm transition ${
                                                  isActive
                                                    ? 'bg-blue-50 text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200'
                                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                                                }`}
                                                style={{ marginLeft: '48px', width: 'calc(100% - 48px)' }}
                                              >
                                                <span className="block truncate">
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
                                          className={`overflow-hidden rounded-lg border border-transparent px-3 py-2 text-left text-sm transition ${
                                            isActive
                                              ? 'bg-blue-50 text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200'
                                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                                          }`}
                                          style={{ marginLeft: '24px', width: 'calc(100% - 24px)' }}
                                        >
                                          <span className="block truncate">
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

                    {filesWithoutFolder.length > 0 && (
                      <div>
                        {folders.length > 0 && (
                          <div className="mt-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                              className={`w-full overflow-hidden rounded-lg border border-transparent px-3 py-3 text-left text-sm transition ${
                                isActive
                                  ? 'bg-blue-50 text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200'
                                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                              }`}
                            >
                              <span className="block truncate">
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

            {/* File Viewer / Editor Panel */}
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {savingMessage && (
                <div className="border-b border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {savingMessage}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                {loadingFiles && files.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                    Loading files...
                  </div>
                ) : fileError ? (
                  <div className="flex h-full items-center justify-center text-red-500">
                    {fileError}
                  </div>
                ) : selectedFileId && loadingSelectedFile ? (
                  <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                    Loading file content...
                  </div>
                ) : selectedFileError ? (
                  <div className="flex h-full items-center justify-center text-red-500">
                    {selectedFileError}
                  </div>
                ) : selectedFile ? (
                  <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
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
                  <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                    Select a file from the explorer to view its content.
                  </div>
                )}
              </div>
            </section>

            {/* AI Chat Panel */}
            <aside className="hidden h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex">
              <FileChatInterface
                selectedFile={selectedFile ?? undefined}
                selectedFileIds={selectedFileId ? [selectedFileId] : []}
              />
            </aside>
          </div>
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