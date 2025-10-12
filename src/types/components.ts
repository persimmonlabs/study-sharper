/**
 * Component Types for Study Sharper
 * 
 * Shared prop interfaces and UI-related types used across components.
 */

import { Note, NoteFolder } from './api'

// ============================================================================
// Common Component Props
// ============================================================================

/**
 * Base props for modal/dialog components
 */
export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Props for confirmation dialogs
 */
export interface ConfirmDialogProps extends BaseModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

// ============================================================================
// Note Component Props
// ============================================================================

/**
 * Props for NoteModal component
 */
export interface NoteModalProps extends BaseModalProps {
  note: Note | null
  onDeleted?: () => void
  onUpdated?: (updated: { id: string; folder_id: string | null }) => void
  folders?: NoteFolder[]
}

/**
 * Props for NotesList component
 */
export interface NotesListProps {
  notes: Note[]
  folders: NoteFolder[]
  selectedFolderId?: string | null
  searchQuery?: string
  onNoteClick?: (note: Note) => void
  onRefresh?: () => void
}

/**
 * Props for NotesUpload component
 */
export interface NotesUploadProps {
  onUploadComplete?: () => void
  selectedFolderId?: string | null
}

/**
 * Props for context menu components
 */
export interface ContextMenuProps {
  isOpen: boolean
  x: number
  y: number
  onClose: () => void
}

/**
 * Props for NoteContextMenu
 */
export interface NoteContextMenuProps extends ContextMenuProps {
  note: Note
  onDelete?: () => void
  onMove?: () => void
  onDownload?: () => void
}

/**
 * Props for FolderContextMenu
 */
export interface FolderContextMenuProps extends ContextMenuProps {
  folder: NoteFolder
  onRename?: () => void
  onChangeColor?: () => void
  onDelete?: () => void
}

// ============================================================================
// Folder Component Props
// ============================================================================

/**
 * Props for UploadFolderDialog
 */
export interface UploadFolderDialogProps extends BaseModalProps {
  folders: NoteFolder[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFolder?: (name: string, color: string) => Promise<void>
}

/**
 * Props for folder selector
 */
export interface FolderSelectorProps {
  folders: NoteFolder[]
  selectedId: string | null
  onSelect: (folderId: string | null) => void
  allowNone?: boolean
  noneLabel?: string
}

// ============================================================================
// Dashboard Component Props
// ============================================================================

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  color?: string
}

/**
 * Props for ProgressRing component
 */
export interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  label?: string
}

/**
 * Props for QuickActionCard component
 */
export interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
  disabled?: boolean
}

/**
 * Props for StreakTracker component
 */
export interface StreakTrackerProps {
  currentStreak: number
  longestStreak: number
  studyDays: Date[]
}

/**
 * Props for WelcomeBanner component
 */
export interface WelcomeBannerProps {
  userName?: string
  studyStreak?: number
}

// ============================================================================
// AI Component Props
// ============================================================================

/**
 * Props for AIAssistantButton
 */
export interface AIAssistantButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

/**
 * Props for AIChatPanel
 */
export interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  noteId?: string
  initialContext?: string
}

/**
 * Chat message display props
 */
export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  isLoading?: boolean
}

// ============================================================================
// Document Viewer Props
// ============================================================================

/**
 * Props for PdfViewer component
 */
export interface PdfViewerProps {
  fileUrl: string
  fileName?: string
  onLoadError?: (error: Error) => void
}

/**
 * Props for DocxViewer component
 */
export interface DocxViewerProps {
  fileUrl: string
  fileName?: string
  onLoadError?: (error: Error) => void
}

// ============================================================================
// Layout Component Props
// ============================================================================

/**
 * Props for Sidebar component
 */
export interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  currentPath: string
}

/**
 * Props for TopBar component
 */
export interface TopBarProps {
  onMenuClick?: () => void
  userName?: string
  avatarUrl?: string
}

/**
 * Props for HeaderNav component
 */
export interface HeaderNavProps {
  showBackButton?: boolean
  onBackClick?: () => void
  title?: string
}

// ============================================================================
// Form Component Props
// ============================================================================

/**
 * Generic form field props
 */
export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string
}

/**
 * Props for text input components
 */
export interface TextInputProps extends FormFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'url'
  disabled?: boolean
  maxLength?: number
}

/**
 * Props for select/dropdown components
 */
export interface SelectProps extends FormFieldProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Option for select components
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Props for color picker
 */
export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  presetColors?: string[]
  label?: string
}

// ============================================================================
// Table/List Component Props
// ============================================================================

/**
 * Generic table column definition
 */
export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

/**
 * Props for generic table component
 */
export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

// ============================================================================
// File Upload Props
// ============================================================================

/**
 * Props for file size warning dialog
 */
export interface FileSizeWarningDialogProps extends BaseModalProps {
  fileSize: number
  maxSize: number
  fileName: string
  onProceed?: () => void
}

/**
 * Props for file dropzone
 */
export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  className?: string
}

/**
 * File upload progress item
 */
export interface UploadProgressItem {
  id: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
}

// ============================================================================
// Theme/UI State Types
// ============================================================================

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Toast/notification types
 */
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

/**
 * Loading state with optional message
 */
export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Navigation menu item
 */
export interface NavMenuItem {
  id: string
  label: string
  path: string
  icon?: React.ReactNode
  badge?: number
  disabled?: boolean
  children?: NavMenuItem[]
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string
  path?: string
  icon?: React.ReactNode
}
