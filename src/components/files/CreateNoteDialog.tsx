import { useState, useMemo, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { createMarkdownFile } from '@/lib/api/filesApi';
import type { FileFolder, FileItem } from '@/types/files';

interface CreateNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (note: FileItem) => void;
  parentFolders?: FileFolder[];
  defaultFolderId?: string | null;
}

export function CreateNoteDialog({
  isOpen,
  onClose,
  onCreated,
  parentFolders = [],
  defaultFolderId = null,
}: CreateNoteDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | ''>(defaultFolderId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const folderOptions = useMemo(() => {
    return [...parentFolders].sort((a, b) => a.name.localeCompare(b.name));
  }, [parentFolders]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFolderId(defaultFolderId ?? '');
  }, [isOpen, defaultFolderId]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Note title is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const note = await createMarkdownFile(title.trim(), content, folderId || undefined);
      onCreated?.(note);
      resetState();
      onClose();
    } catch (err) {
      console.error('Failed to create note:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    resetState();
    onClose();
  }

  function resetState() {
    setTitle('');
    setContent('');
    setFolderId(defaultFolderId ?? '');
    setError(null);
  }

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        <div className="border-b border-slate-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Create Markdown Note</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Write your note in Markdown. It will be saved instantly without needing an upload.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="note-title" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Title
              </label>
              <input
                id="note-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter note title"
              />
            </div>

            <div>
              <label htmlFor="note-content" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Content
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Write your Markdown content here..."
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Supports standard Markdown formatting.</p>
            </div>

            <div>
              <label htmlFor="note-folder" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Folder (optional)
              </label>
              <select
                id="note-folder"
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">No folder</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-slate-200 dark:border-gray-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
