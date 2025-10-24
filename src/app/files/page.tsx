// src/app/files/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { Plus } from 'lucide-react';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
import { FileErrorBoundary } from '@/components/files/FileErrorBoundary';
import { fetchFiles } from '@/lib/api/filesApi';

export default function FilesPage() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setFileError(null);
    try {
      const data = await fetchFiles();
      setFiles(data);
      setSelectedFileId((previous) => {
        if (!data.length) {
          return null;
        }

        if (previous && data.some((file) => file.id === previous)) {
          return previous;
        }

        return data[0].id;
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

  const handleFileCreated = () => {
    setShowCreateNote(false);
    loadFiles();
  };

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId]
  );

  return (
    <FileErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse your uploaded files from the sidebar and create new study notes anytime.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
          {/* File Navigation */}
          <aside className="md:w-72 lg:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-full flex flex-col shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Your Files</h2>
              <button
                onClick={() => setShowCreateNote(true)}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
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
              ) : files.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No files yet. Create your first note to get started.
                </div>
              ) : (
                <nav className="p-2 space-y-1">
                  {files.map((file) => {
                    const isActive = file.id === selectedFileId;
                    return (
                      <button
                        key={file.id}
                        onClick={() => setSelectedFileId(file.id)}
                        className={`w-full text-left px-3 py-3 rounded-lg transition border border-transparent ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200 border-blue-100 dark:border-blue-400/40'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold truncate">
                          {file.title || 'Untitled note'}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          Updated {new Date(file.updated_at).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">File Preview</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a file from the sidebar to view its details.
                </p>
              </div>
              <button
                onClick={() => setShowCreateNote(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                <Plus className="w-4 h-4" />
                Create Note
              </button>
            </div>

            {loadingFiles && files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Loading files...
              </div>
            ) : fileError ? (
              <div className="flex-1 flex items-center justify-center text-red-500">
                {fileError}
              </div>
            ) : selectedFile ? (
              <div className="flex-1">
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/40 h-full flex flex-col">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedFile.title || 'Untitled note'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Last updated {new Date(selectedFile.updated_at).toLocaleString()}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-6">
                    This preview shows the file title. Open the editor from other workflows to view or edit full content.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a file from the sidebar to preview its title.
              </div>
            )}
          </main>
        </div>

        {/* Create Note Dialog */}
        <CreateNoteDialog
          isOpen={showCreateNote}
          onClose={() => setShowCreateNote(false)}
          parentFolders={folders}
          defaultFolderId={null}
          onCreated={handleFileCreated}
        />
      </div>
    </FileErrorBoundary>
  );
}
