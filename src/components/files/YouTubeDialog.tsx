import { useEffect, useMemo, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { uploadYoutubeTranscript } from '@/lib/api/filesApi';
import type { FileFolder, FileItem } from '@/types/files';

interface YouTubeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (file: FileItem) => void;
  parentFolders?: FileFolder[];
  defaultFolderId?: string | null;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be'];

function isValidYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!YOUTUBE_HOSTS.includes(url.hostname)) {
      return false;
    }

    if (url.hostname === 'youtu.be') {
      return Boolean(url.pathname.slice(1));
    }

    if (url.pathname === '/watch') {
      return url.searchParams.has('v');
    }

    return url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/');
  } catch {
    return false;
  }
}

export function YouTubeDialog({
  isOpen,
  onClose,
  onUploaded,
  parentFolders = [],
  defaultFolderId = null,
}: YouTubeDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | ''>(defaultFolderId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const folderOptions = useMemo(() => {
    return [...parentFolders].sort((a, b) => a.name.localeCompare(b.name));
  }, [parentFolders]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFolderId(defaultFolderId ?? '');
  }, [isOpen, defaultFolderId]);

  if (!isOpen || !isClient || typeof document === 'undefined') {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim()) {
      setError('YouTube URL is required.');
      return;
    }

    if (!isValidYoutubeUrl(url.trim())) {
      setError('Please enter a valid YouTube URL.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const file = await uploadYoutubeTranscript(url.trim(), title.trim() || undefined, folderId || undefined);
      onUploaded?.(file);
      resetState();
      onClose();
    } catch (err) {
      console.error('YouTube transcript upload failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to process YouTube URL.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    resetState();
    onClose();
  }

  function resetState() {
    setUrl('');
    setTitle('');
    setFolderId(defaultFolderId ?? '');
    setError(null);
  }

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Upload YouTube Transcript</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste a YouTube link and we&apos;ll extract the transcript for you automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-700">
                YouTube URL
              </label>
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label htmlFor="youtube-title" className="block text-sm font-medium text-slate-700">
                Title (optional)
              </label>
              <input
                id="youtube-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter a custom title"
              />
            </div>

            <div>
              <label htmlFor="youtube-folder" className="block text-sm font-medium text-slate-700">
                Folder (optional)
              </label>
              <select
                id="youtube-folder"
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">No folder</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
