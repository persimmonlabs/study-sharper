'use client';

import React, { useEffect, useState } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export function ProcessingBar() {
  const { processingFiles, removeProcessingFile } = useProcessing();
  const [completedFiles, setCompletedFiles] = useState<Set<string>>(new Set());

  // Auto-dismiss completed files after 2 seconds
  useEffect(() => {
    const completedFileIds = processingFiles
      .filter((file) => file.status === 'completed')
      .map((file) => file.id);

    if (completedFileIds.length === 0) return;

    const timers = completedFileIds.map((id) =>
      setTimeout(() => {
        removeProcessingFile(id);
        setCompletedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 2000)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [processingFiles, removeProcessingFile]);

  if (processingFiles.length === 0) {
    return null;
  }

  const currentFile = processingFiles[0];
  const pendingCount = processingFiles.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: File info and progress */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {currentFile.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : currentFile.status === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {currentFile.filename}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentFile.status === 'completed'
                  ? '✅ Processing complete'
                  : currentFile.status === 'error'
                  ? `❌ ${currentFile.error || 'Processing failed'}`
                  : currentFile.status === 'uploading'
                  ? 'Uploading...'
                  : 'Processing with AI...'}
              </p>
            </div>
          </div>

          {/* Middle: Badge for pending files */}
          {pendingCount > 0 && (
            <div className="flex-shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              +{pendingCount} more
            </div>
          )}

          {/* Right: Cancel button (only for non-completed files) */}
          {currentFile.status !== 'completed' && currentFile.status !== 'error' && (
            <button
              onClick={() => removeProcessingFile(currentFile.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Cancel upload"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* Right: Close button (for completed/error files) */}
          {(currentFile.status === 'completed' || currentFile.status === 'error') && (
            <button
              onClick={() => removeProcessingFile(currentFile.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {currentFile.status !== 'completed' && currentFile.status !== 'error' && (
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${currentFile.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
