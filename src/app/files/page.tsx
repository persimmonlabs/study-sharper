// src/app/files/page.tsx
'use client';

import { useState } from 'react';
import { FileFolder } from '@/types/files';
import { Plus } from 'lucide-react';
import { CreateNoteDialog } from '@/components/files/CreateNoteDialog';
import { FileErrorBoundary } from '@/components/files/FileErrorBoundary';

export default function FilesPage() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [showCreateNote, setShowCreateNote] = useState(false);


  const handleFileCreated = () => {
    setShowCreateNote(false);
  };

  return (
    <FileErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage your study notes with a simple markdown editor
          </p>
        </div>

        {/* Centered Create Note Button */}
        <div className="flex items-center justify-center min-h-[500px]">
          <button
            onClick={() => setShowCreateNote(true)}
            className="flex flex-col items-center justify-center gap-4 px-8 py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all duration-200"
          >
            <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Create a New Note
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start writing your study notes in markdown format
              </p>
            </div>
          </button>
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
