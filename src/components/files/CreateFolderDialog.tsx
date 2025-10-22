import { useState, useMemo, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { createFolder } from '@/lib/api/filesApi';
import type { FileFolder } from '@/types/files';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (folder: FileFolder) => void;
  parentFolders?: FileFolder[];
  defaultParentId?: string | null;
}

const COLORS = [
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
];

const COLOR_DOT_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  pink: 'bg-pink-400',
};

const COLOR_ACTIVE_CLASSES: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-50 text-blue-700',
  red: 'border-red-500 bg-red-50 text-red-700',
  green: 'border-green-500 bg-green-50 text-green-700',
  yellow: 'border-yellow-500 bg-yellow-50 text-yellow-700',
  purple: 'border-purple-500 bg-purple-50 text-purple-700',
  pink: 'border-pink-500 bg-pink-50 text-pink-700',
};

export function CreateFolderDialog({
  isOpen,
  onClose,
  onCreated,
  parentFolders = [],
  defaultParentId = null,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);
  const [parentId, setParentId] = useState<string | ''>(defaultParentId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const options = useMemo(() => {
    return [...parentFolders].sort((a, b) => a.name.localeCompare(b.name));
  }, [parentFolders]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setParentId(defaultParentId ?? '');
  }, [isOpen, defaultParentId]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Folder name is required.');
      return;
    }

    if (name.length > 100) {
      setError('Folder name must be 100 characters or less.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const folder = await createFolder(name.trim(), color, parentId || undefined);
      setIsSubmitting(false);
      setName('');
      setColor(COLORS[0].value);
      setParentId(defaultParentId ?? '');
      onCreated?.(folder);
      onClose();
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder.');
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setName('');
    setColor(COLORS[0].value);
    setParentId(defaultParentId ?? '');
    setError(null);
    onClose();
  }

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        <div className="border-b border-slate-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Create New Folder</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Folder Name
              </label>
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter folder name"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Maximum 100 characters.</p>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-gray-300">Color</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`flex items-center rounded-md border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      color === colorOption.value
                        ? COLOR_ACTIVE_CLASSES[colorOption.value]
                        : 'border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`mr-2 h-3 w-3 rounded-full ${COLOR_DOT_CLASSES[colorOption.value]}`}
                    ></span>
                    {colorOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="parent-folder" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Parent Folder (optional)
              </label>
              <select
                id="parent-folder"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">No parent folder</option>
                {options.map((folder) => (
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
