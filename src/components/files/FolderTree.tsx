// src/components/files/FolderTree.tsx
'use client';

import { MouseEvent as ReactMouseEvent, useMemo } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface FolderTreeProps {
  folders: FileFolder[];
  files: FileItem[];
  selectedFileId: string | null;
  expandedFolders: string[];
  folderColorClasses: Record<string, string>;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (fileId: string) => void;
  onFileContextMenu: (event: ReactMouseEvent, file: FileItem) => void;
  onFolderContextMenu: (event: ReactMouseEvent, folder: FileFolder) => void;
}

export function FolderTree({
  folders,
  files,
  selectedFileId,
  expandedFolders,
  folderColorClasses,
  onToggleFolder,
  onSelectFile,
  onFileContextMenu,
  onFolderContextMenu,
}: FolderTreeProps) {
  // Separate root folders from subfolders
  const rootFolders = useMemo(
    () => folders.filter((f) => !f.parent_folder_id),
    [folders]
  );

  // Get subfolders for a given parent
  const getSubfolders = (parentId: string) => {
    return folders.filter((f) => f.parent_folder_id === parentId);
  };

  // Get files for a given folder
  const getFilesInFolder = (folderId: string) => {
    return files.filter((f) => f.folder_id === folderId);
  };

  // Get files without any folder
  const filesWithoutFolder = useMemo(
    () => files.filter((f) => !f.folder_id),
    [files]
  );

  // Render a single file
  const renderFile = (file: FileItem, indentLevel: number) => {
    const isActive = file.id === selectedFileId;

    return (
      <button
        key={file.id}
        onClick={() => onSelectFile(file.id)}
        onContextMenu={(event) => onFileContextMenu(event, file)}
        className={`w-full text-left px-3 py-2 rounded-lg transition border border-transparent overflow-hidden ${
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200 border-blue-100 dark:border-blue-400/40'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
        }`}
        style={{ marginLeft: `${indentLevel * 24}px` }}
      >
        <span className="block text-sm font-semibold truncate">
          {file.title || 'Untitled note'}
        </span>
      </button>
    );
  };

  // Render a subfolder and its contents
  const renderSubfolder = (subfolder: FileFolder, indentLevel: number) => {
    const isExpanded = expandedFolders.includes(subfolder.id);
    const subfolderFiles = getFilesInFolder(subfolder.id);
    const nestedSubfolders = getSubfolders(subfolder.id);

    return (
      <div key={subfolder.id} className="space-y-1 overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleFolder(subfolder.id)}
          onContextMenu={(event) => onFolderContextMenu(event, subfolder)}
          className="w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden"
          style={{ marginLeft: `${indentLevel * 24}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen
              className="h-4 w-4 flex-shrink-0"
              style={{
                color:
                  folderColorClasses[subfolder.color as keyof typeof folderColorClasses] ||
                  '#3b82f6',
              }}
            />
          ) : (
            <Folder
              className="h-4 w-4 flex-shrink-0"
              style={{
                color:
                  folderColorClasses[subfolder.color as keyof typeof folderColorClasses] ||
                  '#3b82f6',
              }}
            />
          )}
          <span className="text-sm font-semibold truncate">{subfolder.name}</span>
        </button>

        {isExpanded && (
          <div className="space-y-1">
            {/* Render nested subfolders first */}
            {nestedSubfolders.map((nested) => renderSubfolder(nested, indentLevel + 1))}

            {/* Then render files in this subfolder */}
            {subfolderFiles.map((file) => renderFile(file, indentLevel + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render a root folder and its contents
  const renderRootFolder = (folder: FileFolder) => {
    const isExpanded = expandedFolders.includes(folder.id);
    const folderFiles = getFilesInFolder(folder.id);
    const subfolders = getSubfolders(folder.id);

    return (
      <div key={folder.id} className="space-y-1 overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleFolder(folder.id)}
          onContextMenu={(event) => onFolderContextMenu(event, folder)}
          className="w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen
              className="h-4 w-4 flex-shrink-0"
              style={{
                color:
                  folderColorClasses[folder.color as keyof typeof folderColorClasses] ||
                  '#3b82f6',
              }}
            />
          ) : (
            <Folder
              className="h-4 w-4 flex-shrink-0"
              style={{
                color:
                  folderColorClasses[folder.color as keyof typeof folderColorClasses] ||
                  '#3b82f6',
              }}
            />
          )}
          <span className="text-sm font-semibold truncate">{folder.name}</span>
        </button>

        {isExpanded && (
          <div className="space-y-1">
            {/* Render subfolders first */}
            {subfolders.map((subfolder) => renderSubfolder(subfolder, 1))}

            {/* Then render files directly in this folder */}
            {folderFiles.map((file) => renderFile(file, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="p-2 space-y-1 overflow-x-hidden">
      {/* Render all root folders - always visible */}
      {rootFolders.length > 0 ? (
        rootFolders.map((folder) => renderRootFolder(folder))
      ) : null}

      {/* Render files without folder (if any) */}
      {filesWithoutFolder.length > 0 && (
        <div>
          {rootFolders.length > 0 && (
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">
              Files
            </div>
          )}
          {filesWithoutFolder.map((file) => renderFile(file, 0))}
        </div>
      )}
    </nav>
  );
}
