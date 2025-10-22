'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import type { FormEvent, MouseEvent, ChangeEvent } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { fetchNotesList, fetchFoldersList, type ApiResult } from '@/lib/api/notesApi'
import { NoteModal } from '@/components/notes/NoteModal'
import { NoteContextMenu } from '@/components/notes/NoteContextMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileSizeWarningDialog } from '@/components/ui/FileSizeWarningDialog'
import { FolderContextMenu } from '@/components/notes/FolderContextMenu'
import { UploadFolderDialog } from '@/components/ui/UploadFolderDialog'
import { AIChatPanel } from '@/components/ai/AIChatPanel'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Skeleton } from '@/components/ui/Skeleton'
import { OcrPremiumDialog } from '@/components/ui/OcrPremiumDialog'
import type { User } from '@supabase/supabase-js'

type Note = Database['public']['Tables']['notes']['Row'] & {
  summary?: string
  tags?: string[]
  file_type?: string
  transcription?: string
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  extraction_method?: string
  error_message?: string
  original_filename?: string
  ocr_processed?: boolean
  edited_manually?: boolean
  highlights?: Array<{
    id: string
    text: string
    color: string
    position: number
  }>
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  noteId?: string
  sources?: Array<{ id: string; title: string }>
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  summary?: string
  transcription?: string
}

type NoteFolder = Database['public']['Tables']['note_folders']['Row']

const FOLDER_COLORS = ['#991b1b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#92400e', '#6b7280']
const FOLDER_LIMIT = 10

const generateMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Defensive utility to ensure arrays are never null/undefined
function normalizeList<T>(value: T[] | null | undefined): T[] {
  if (!Array.isArray(value)) return []
  return value
}

// Helper function to get session token with caching
let cachedToken: string | null = null
let tokenExpiry: number = 0

const getSessionToken = async (): Promise<string | null> => {
  try {
    // Return cached token if still valid (cache for 5 minutes)
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken
    }
    
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[Notes] Session error:', error)
      cachedToken = null
      return null
    }
    
    // Cache token for 5 minutes
    cachedToken = session?.access_token || null
    tokenExpiry = Date.now() + (5 * 60 * 1000)
    
    return cachedToken
  } catch (error) {
    console.error('[Notes] Failed to get session:', error)
    cachedToken = null
    return null
  }
}

export default function Notes() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300) // Debounce search by 300ms
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'summaries' | 'search'>('upload')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteTags, setNewNoteTags] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [modalNote, setModalNote] = useState<Note | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; noteId: string | null; noteTitle: string }>({ isOpen: false, noteId: null, noteTitle: '' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [fileSizeWarning, setFileSizeWarning] = useState<{ isOpen: boolean; file: File | null; pendingUpload: (() => void) | null }>({ isOpen: false, file: null, pendingUpload: null })
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<string>(FOLDER_COLORS[0])
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: NoteFolder } | null>(null)
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<{ isOpen: boolean; folder: NoteFolder | null }>({ isOpen: false, folder: null })
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [isRenamingFolder, setIsRenamingFolder] = useState(false)
  const [isSavingFolderRename, setIsSavingFolderRename] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([])
  const [ocrWarning, setOcrWarning] = useState<{ isOpen: boolean; file: File | null; pendingUpload: (() => void) | null }>({ isOpen: false, file: null, pendingUpload: null })
  
  // Error states for better UX
  const [notesError, setNotesError] = useState<string | null>(null)
  const [foldersError, setFoldersError] = useState<string | null>(null)
  
  // Polling state for processing notes
  const [pollingNoteIds, setPollingNoteIds] = useState<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Defensive: ensure folders is always an array for rendering
  const safeFolders = normalizeList(folders)

  const canCreateMoreFolders = safeFolders.length < FOLDER_LIMIT
  
  // Close create folder dialog if limit reached
  useEffect(() => {
    if (safeFolders.length >= FOLDER_LIMIT && isCreateFolderOpen) {
      setIsCreateFolderOpen(false)
    }
  }, [safeFolders.length, isCreateFolderOpen])

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null
    return safeFolders.find(folder => folder.id === selectedFolderId) ?? null
  }, [safeFolders, selectedFolderId])

  // OCR file size limit (1MB = 1024 * 1024 bytes)
  const OCR_SIZE_LIMIT = 1024 * 1024

  const fetchFolders = useCallback(async (currentUser: User, signal?: AbortSignal): Promise<boolean> => {
    console.log('[fetchFolders] Starting folder fetch for user:', currentUser.id)
    setFoldersError(null)
    
    const result = await fetchFoldersList(signal, { retries: 2, initialDelayMs: 500 })
    
    if (result.ok && result.data) {
      setFolders(result.data)
      setFoldersError(null)
      setSelectedFolderId(prev => {
        if (!prev) return prev
        return result.data?.some((folder: NoteFolder) => folder.id === prev) ? prev : null
      })
      console.log('[fetchFolders] Success:', result.data.length, 'folders')
      return true
    } else {
      // Handle errors
      if (result.status === 401 || result.status === 'auth_error') {
        console.error('[Notes] Unauthorized - redirecting to login')
        router.push('/auth/login?next=/notes')
        return false
      }
      
      const errorMsg = result.error || 'Failed to load folders'
      console.warn('[fetchFolders] Failed:', errorMsg)
      setFoldersError(errorMsg)
      
      // Keep existing folders on error (don't wipe state)
      // Only clear if we have no data at all
      if (folders.length === 0) {
        setFolders([])
      }
      return false
    }
  }, [router, folders.length])

  const handleFolderDelete = async (folder: NoteFolder) => {
    if (!user) return

    setIsDeletingFolder(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      setFolders(prev => prev.filter(f => f.id !== folder.id))

      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null)
      }

      if (isCreateFolderOpen && folders.length - 1 < FOLDER_LIMIT) {
        setIsCreateFolderOpen(false)
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert('Failed to delete folder. Please try again.')
    } finally {
      setIsDeletingFolder(false)
      setFolderDeleteConfirm({ isOpen: false, folder: null })
    }
  }

  const handleFolderContextMenu = (event: MouseEvent<HTMLButtonElement>, folder: NoteFolder) => {
    event.preventDefault()
    setFolderContextMenu({ x: event.clientX, y: event.clientY, folder })
  }

  const handleFolderRenameStart = (folder: NoteFolder) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
    setIsRenamingFolder(true)
    setIsSavingFolderRename(false)
    setFolderContextMenu(null)
    
    // Auto-focus the rename input after render
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 0)
  }

  const handleFolderRenameCancel = () => {
    if (isSavingFolderRename) return
    setEditingFolderId(null)
    setEditingFolderName('')
    setIsRenamingFolder(false)
  }

  const handleFolderRenameSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!editingFolderId || !editingFolderName.trim() || !user) return

    setIsSavingFolderRename(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch(`/api/folders/${editingFolderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: editingFolderName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Folder rename failed');
      }

      const updatedFolder = await response.json() as NoteFolder

      setFolders(prev => prev.map(folder => (folder.id === editingFolderId ? updatedFolder : folder)))

      if (selectedFolderId === editingFolderId) {
        setSelectedFolderId(updatedFolder.id)
      }

      handleFolderRenameCancel()
    } catch (error) {
      console.error('Failed to rename folder:', error)
      alert('Failed to rename folder. Please try again.')
    } finally {
      setIsSavingFolderRename(false)
    }
  }

  const fetchNotes = useCallback(async (currentUser: User, signal?: AbortSignal): Promise<boolean> => {
    console.log('[fetchNotes] Starting notes fetch for user:', currentUser.id)
    setNotesError(null)
    
    const result = await fetchNotesList(signal, { retries: 2, initialDelayMs: 500 })
    
    if (result.ok && result.data) {
      setNotes(result.data)
      setNotesError(null)
      setSelectedNote(prev => (prev && result.data?.some(note => note.id === prev.id)) ? prev : (result.data?.[0] ?? null))

      const uniqueTags = new Set<string>()
      result.data?.forEach((note: Note) => {
        note.tags?.forEach((tag: string) => uniqueTags.add(tag))
      })
      setAvailableTags(Array.from(uniqueTags).sort())
      console.log('[fetchNotes] Success:', result.data.length, 'notes')
      return true
    } else {
      // Handle errors
      if (result.status === 401 || result.status === 'auth_error') {
        console.error('[Notes] Unauthorized - redirecting to login')
        router.push('/auth/login?next=/notes')
        return false
      }
      
      const errorMsg = result.error || 'Failed to load notes'
      console.warn('[fetchNotes] Failed:', errorMsg)
      setNotesError(errorMsg)
      
      // Keep existing notes on error (don't wipe state)
      // Only clear if we have no data at all
      if (notes.length === 0) {
        setNotes([])
        setAvailableTags([])
        setSelectedNote(null)
      }
      return false
    }
  }, [router, notes.length])

  // Poll note status for processing notes
  const pollNoteStatus = useCallback(async (noteId: string) => {
    try {
      const accessToken = await getSessionToken()
      if (!accessToken) return

      const response = await fetch(`/api/notes/${noteId}/status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        console.error(`[pollNoteStatus] Failed to get status for note ${noteId}`)
        return
      }

      const status = await response.json()
      
      // Update note in state
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, processing_status: status.processing_status, extraction_method: status.extraction_method, error_message: status.error_message }
          : note
      ))

      // If completed or failed, stop polling this note
      if (status.processing_status === 'completed' || status.processing_status === 'failed') {
        setPollingNoteIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(noteId)
          return newSet
        })
        
        // Show toast notification for failed processing
        if (status.processing_status === 'failed' && status.error_message) {
          console.error(`[Note Processing] Failed for ${noteId}: ${status.error_message}`)
          // Could add a toast notification here
        }
        
        // Refresh full note data if completed
        if (status.processing_status === 'completed' && user) {
          await fetchNotes(user)
        }
      }
    } catch (error) {
      console.error(`[pollNoteStatus] Error polling note ${noteId}:`, error)
    }
  }, [user, fetchNotes])

  // Retry processing for a failed note
  const retryNoteProcessing = useCallback(async (noteId: string) => {
    try {
      const accessToken = await getSessionToken()
      if (!accessToken) return

      const response = await fetch(`/api/notes/${noteId}/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to retry processing')
      }

      // Add to polling set
      setPollingNoteIds(prev => new Set(prev).add(noteId))
      
      // Update status to pending
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, processing_status: 'pending' as const, error_message: undefined }
          : note
      ))
      
      console.log(`[retryNoteProcessing] Retry queued for note ${noteId}`)
    } catch (error) {
      console.error(`[retryNoteProcessing] Error:`, error)
      alert('Failed to retry processing. Please try again.')
    }
  }, [])

  // Effect to start polling for processing notes
  useEffect(() => {
    // Find notes that are pending or processing
    const processingNotes = notes.filter(note => 
      note.processing_status === 'pending' || note.processing_status === 'processing'
    )
    
    // Add them to polling set
    if (processingNotes.length > 0) {
      setPollingNoteIds(prev => {
        const newSet = new Set(prev)
        processingNotes.forEach(note => newSet.add(note.id))
        return newSet
      })
    }
  }, [notes])

  // Effect to manage polling interval
  useEffect(() => {
    if (pollingNoteIds.size === 0) {
      // Clear interval if no notes to poll
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Start polling every 2 seconds
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        pollingNoteIds.forEach(noteId => {
          pollNoteStatus(noteId)
        })
      }, 2000)
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [pollingNoteIds, pollNoteStatus])

  // Load data when user is available
  // CRITICAL FIX: Use Promise.allSettled instead of Promise.all
  // This ensures one failure doesn't block the other from displaying
  useEffect(() => {
    console.debug('[Notes] useEffect triggered', { authLoading, hasUser: !!user })
    
    if (authLoading) {
      console.debug('[Notes] Still auth loading, waiting...')
      return
    }

    if (!user) {
      console.debug('[Notes] No user, setting loading to false')
      setLoading(false)
      return
    }

    console.log('[Notes] User available, starting data load')
    
    // AbortController for cleanup - cancels requests on unmount
    const abortController = new AbortController()
    let isMounted = true
    
    // Safety timeout - force loading to false after 35 seconds (matches backend timeout)
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[Notes] Safety timeout triggered - forcing loading to false')
        setLoading(false)
      }
    }, 35000)

    const loadData = async () => {
      console.log('[Notes] Starting parallel data load...')
      const startTime = Date.now()
      
      try {
        // CRITICAL: Use allSettled so folders can load even if notes fail (or vice versa)
        const results = await Promise.allSettled([
          fetchNotes(user, abortController.signal),
          fetchFolders(user, abortController.signal)
        ])
        
        if (!isMounted) {
          console.log('[Notes] Component unmounted, skipping state updates')
          return
        }
        
        const loadTime = Date.now() - startTime
        
        // Check if at least one succeeded
        const [notesResult, foldersResult] = results
        const notesSuccess = notesResult.status === 'fulfilled' && notesResult.value === true
        const foldersSuccess = foldersResult.status === 'fulfilled' && foldersResult.value === true
        
        console.log('[Notes] Load results:', {
          notes: notesResult.status,
          notesSuccess,
          folders: foldersResult.status,
          foldersSuccess,
          timeMs: loadTime
        })
        
        // CRITICAL FIX: Only hide loading if at least one data source loaded successfully
        // This prevents showing empty state when backend is slow but working
        if (notesSuccess || foldersSuccess) {
          console.log('[Notes] At least one data source loaded - setting loading to FALSE')
          setLoading(false)
        } else {
          console.warn('[Notes] Both data sources failed - keeping loading state visible')
          // Keep loading=true so user sees spinner instead of empty state
          // Errors will be shown via ErrorBanner components
        }
      } catch (error) {
        console.error('[Notes] Unexpected error in loadData:', error)
        if (isMounted) {
          console.log('[Notes] Error occurred, setting loading to FALSE anyway')
          setLoading(false)
        }
      }
    }

    loadData()

    // Cleanup function - cancels pending requests
    return () => {
      console.log('[Notes] Cleaning up - aborting pending requests')
      clearTimeout(safetyTimeout)
      isMounted = false
      abortController.abort()
    }
  }, [user, authLoading, fetchNotes, fetchFolders])

  const filteredNotes = useMemo(() => {
    // Defensive: ensure notes is always an array
    const safeNotes = normalizeList(notes)
    return safeNotes.filter(note => {
      // Note: content field is not available in lightweight notes
      // Search only by title and tags for performance
      const matchesSearch = debouncedSearchTerm === '' || 
        note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase())))

      const matchesTags = selectedTags.length === 0 ||
        (note.tags && selectedTags.every(tag => note.tags?.includes(tag)))

      const matchesFolder = !selectedFolderId || note.folder_id === selectedFolderId

      return matchesSearch && matchesTags && matchesFolder
    })
  }, [notes, debouncedSearchTerm, selectedTags, selectedFolderId])

  useEffect(() => {
    if (!selectedFolderId) return
    if (selectedNote && selectedNote.folder_id === selectedFolderId) return
    const firstMatch = filteredNotes[0] ?? null
    setSelectedNote(firstMatch)
  }, [filteredNotes, selectedFolderId, selectedNote])

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    if (!folderId) {
      setSelectedNote(prev => {
        if (prev && notes.some(note => note.id === prev.id)) {
          return prev
        }
        return notes[0] ?? null
      })
      return
    }

    const firstMatch = notes.find(note => note.folder_id === folderId) ?? null
    setSelectedNote(firstMatch)
  }

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim() || !canCreateMoreFolders) return

    // Check for duplicate folder name
    const isDuplicate = folders.some(folder => 
      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
    )
    
    if (isDuplicate) {
      alert(`A folder named "${newFolderName.trim()}" already exists. Please choose a different name.`)
      return
    }

    setIsCreatingFolder(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();

      setFolders(prev => [...prev, data])
      setIsCreateFolderOpen(false)
      setNewFolderName('')
      setNewFolderColor(FOLDER_COLORS[0])
      setSelectedFolderId(data.id)
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder. Please try again.')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  // Used by UploadFolderDialog: creates a folder and returns the created option
  const handleUploadCreateFolder = async (
    name: string,
    color: string
  ): Promise<{ id: string; name: string; color: string } | null> => {
    if (!user || !name.trim() || !canCreateMoreFolders) return null
    
    // Check for duplicate folder name
    const isDuplicate = folders.some(folder => 
      folder.name.toLowerCase() === name.trim().toLowerCase()
    )
    
    if (isDuplicate) {
      alert(`A folder named "${name.trim()}" already exists. Please choose a different name.`)
      return null
    }
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), color }),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json() as NoteFolder
      setFolders(prev => [...prev, data])
      return { id: data.id, name: data.name, color: data.color }
    } catch (e) {
      console.error('Upload create folder error:', e)
      return null
    }
  }

  const openUploadDialog = (files: File[]) => {
    if (files.length === 0) return
    setPendingUploadFiles(files)
    setIsUploadDialogOpen(true)
  }

  const handleUploadDialogCancel = () => {
    setIsUploadDialogOpen(false)
    setPendingUploadFiles([])
  }

  const handleUploadDialogSelect = (folderId: string | null) => {
    if (pendingUploadFiles.length === 0) {
      setIsUploadDialogOpen(false)
      return
    }

    void handleFileUpload(pendingUploadFiles, folderId)
    setIsUploadDialogOpen(false)
    setPendingUploadFiles([])
  }



  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (!files || files.length === 0) return

    openUploadDialog(Array.from(files))
    event.target.value = ''
  }

  // Check if file needs OCR
  const checkOcrRequirement = async (file: File, accessToken: string): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/notes/check-ocr', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        console.error('OCR check failed, assuming no OCR needed')
        return false
      }

      const data = await response.json()
      return data.needs_ocr || false
    } catch (error) {
      console.error('Error checking OCR requirement:', error)
      return false // Default to no OCR if check fails
    }
  }

  const handleFileUpload = async (files: File[], folderOverride?: string | null) => {
    if (files.length === 0) return

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      console.error('No active session found for upload', sessionError)
      alert('Your session has expired. Please sign in again to upload files.')
      return
    }

    const accessToken = session.access_token
    const targetFolderId = folderOverride ?? null

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Check for duplicate filename
      const fileNameWithoutExt = file.name.replace(/\.(pdf|docx)$/i, '')
      const isDuplicate = notes.some(note => 
        note.title === fileNameWithoutExt && 
        (!targetFolderId || note.folder_id === targetFolderId)
      )
      
      if (isDuplicate) {
        const confirmUpload = confirm(
          `A file named "${fileNameWithoutExt}" already exists${targetFolderId ? ' in this folder' : ''}. Do you want to upload it anyway?`
        )
        if (!confirmUpload) {
          continue
        }
      }

      // Only process PDFs and DOCX files
      const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!supportedTypes.includes(file.type)) {
        alert(`${file.name} is not supported. Only PDF and DOCX files are currently supported.`)
        continue
      }

      // Check file size and prompt user if too large for AI features
      if (file.size > OCR_SIZE_LIMIT) {
        await new Promise<void>((resolve) => {
          setFileSizeWarning({
            isOpen: true,
            file,
            pendingUpload: () => {
              setFileSizeWarning({ isOpen: false, file: null, pendingUpload: null })
              uploadFile(file, accessToken, i, true, targetFolderId) // skipAI = true
              resolve()
            }
          })
        })
        continue
      }

      // Check if file needs OCR (only for PDFs)
      if (file.type === 'application/pdf') {
        const needsOcr = await checkOcrRequirement(file, accessToken)
        
        if (needsOcr) {
          // Show premium gate dialog
          await new Promise<void>((resolve) => {
            setOcrWarning({
              isOpen: true,
              file,
              pendingUpload: () => {
                setOcrWarning({ isOpen: false, file: null, pendingUpload: null })
                uploadFile(file, accessToken, i, true, targetFolderId) // skipAI = true (limited extraction)
                resolve()
              }
            })
          })
          continue
        }
      }

      // File is within size limit and doesn't need OCR, proceed normally
      await uploadFile(file, accessToken, i, false, targetFolderId)
    }
  }

  const uploadFile = async (file: File, accessToken: string, index: number, skipAI: boolean, targetFolderId: string | null) => {
    const newFile: UploadedFile = {
      id: Date.now().toString() + index,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      status: 'uploading'
    }

    setUploadedFiles((prev: UploadedFile[]) => [...prev, newFile])

    try {
      // Create FormData for the upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.(pdf|docx)$/i, ''))
      if (skipAI) {
        formData.append('skipAI', 'true')
      }
      if (targetFolderId) {
        formData.append('folder_id', targetFolderId)
      }

      // Upload to our API (auth via cookies)
      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      let data: { error?: string } | null = null
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          data = await response.json()
        } catch (parseError) {
          console.error('Failed to parse upload response as JSON', parseError)
        }
      }

      if (!response.ok) {
        const message = data?.error || `Upload failed (status ${response.status})`
        throw new Error(message)
      }

      // Update status to completed
      setUploadedFiles((prev: UploadedFile[]) => prev.map(f =>
        f.id === newFile.id ? { 
          ...f, 
          status: 'completed',
          summary: 'File uploaded and text extracted successfully!'
        } : f
      ))

      // Refresh notes list to show the new note
      if (user) {
        await fetchNotes(user)
      }

      // Remove from upload queue after 2 seconds
      setTimeout(() => {
        setUploadedFiles((prev: UploadedFile[]) => prev.filter(f => f.id !== newFile.id))
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      
      // Update status to error
      setUploadedFiles((prev: UploadedFile[]) => prev.map(f =>
        f.id === newFile.id ? { 
          ...f, 
          status: 'error'
        } : f
      ))

      alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileSizeWarningCancel = () => {
    setFileSizeWarning({ isOpen: false, file: null, pendingUpload: null })
  }

  const handleFileSizeWarningConfirm = () => {
    if (fileSizeWarning.pendingUpload) {
      fileSizeWarning.pendingUpload()
    }
  }

  const handleOcrWarningCancel = () => {
    setOcrWarning({ isOpen: false, file: null, pendingUpload: null })
  }

  const handleOcrWarningProceed = () => {
    if (ocrWarning.pendingUpload) {
      ocrWarning.pendingUpload()
    }
  }

  const getFileTypeTags = (mimeType: string): string[] => {
    const tags: string[] = []

    if (mimeType.includes('pdf')) {
      tags.push('pdf', 'document')
    } else if (mimeType.includes('audio')) {
      tags.push('audio', 'recording')
    } else if (mimeType.includes('image')) {
      tags.push('image', 'visual')
    } else if (mimeType.includes('video')) {
      tags.push('video', 'visual')
    } else if (mimeType.includes('text')) {
      tags.push('text', 'document')
    } else {
      tags.push('file', 'uploaded')
    }

    return tags
  }

  const handleCreateNote = async () => {
    if (!user || !newNoteTitle.trim()) return

    setIsCreating(true)
    try {
      const tagsArray = newNoteTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: newNoteTitle.trim(),
          content: newNoteContent.trim() || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          folder_id: selectedFolderId ?? null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[createNote] API error:', response.status, errorText);
        throw new Error(`Failed to create note: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Clear form
      setNewNoteTitle('')
      setNewNoteContent('')
      setNewNoteTags('')

      // Refresh notes list
      await fetchNotes(user)

      // Select the new note
      if (data) {
        setSelectedNote(data)
      }
    } catch (error) {
      console.error('Error creating note:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        alert('Cannot connect to backend server. Please ensure the backend is running at http://127.0.0.1:8000')
      } else {
        alert(`Failed to create note: ${errorMessage}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleClearNoteFields = () => {
    setNewNoteTitle('')
    setNewNoteContent('')
  }

  const handleViewNote = (note: Note) => {
    setModalNote(note)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalNote(null)
  }

  const handleNoteDeleted = () => {
    // Close modal
    setIsModalOpen(false)
    setModalNote(null)
    
    // Refresh notes from database
    if (user) {
      fetchNotes(user)
      fetchFolders(user)
    }
  }

  const handleNoteUpdated = (updated: { id: string; folder_id: string | null }) => {
    setNotes(prev => prev.map(note => note.id === updated.id ? { ...note, folder_id: updated.folder_id } : note))
    setModalNote(prev => prev && prev.id === updated.id ? { ...prev, folder_id: updated.folder_id } : prev)

    if (selectedFolderId && updated.folder_id !== selectedFolderId) {
      setSelectedNote(prev => (prev && prev.id === updated.id) ? null : prev)
    }

    if (user) {
      fetchNotes(user)
      fetchFolders(user)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, noteId })
  }

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    if (!user) return

    const noteToUpdate = notes.find(note => note.id === noteId)
    if (!noteToUpdate || noteToUpdate.folder_id === folderId) {
      setContextMenu(null)
      return
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch(`/api/notes/${noteId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ folder_id: folderId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to move note');
      }

      setNotes(prev => prev.map(note => note.id === noteId ? { ...note, folder_id: folderId } : note))
      setSelectedNote(prev => {
        if (!prev || prev.id !== noteId) return prev
        return { ...prev, folder_id: folderId }
      })
      setModalNote(prev => {
        if (!prev || prev.id !== noteId) return prev
        return { ...prev, folder_id: folderId }
      })

      if (selectedFolderId && folderId !== selectedFolderId) {
        setSelectedNote(prev => (prev && prev.id === noteId) ? null : prev)
      }

      setContextMenu(null)

      if (user) {
        fetchFolders(user)
      }
    } catch (error) {
      console.error('Failed to move note:', error)
      alert('Failed to move note. Please try again.')
    }
  }

  const handleDeleteClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setDeleteConfirm({ isOpen: true, noteId, noteTitle: note.title })
      setContextMenu(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.noteId || !user) return

    const noteId = deleteConfirm.noteId
    const previousNotes = [...notes]
    const previousSelectedNote = selectedNote

    setIsDeleting(true)
    
    // Optimistic update - remove note immediately
    setNotes(prev => prev.filter(n => n.id !== noteId))
    if (selectedNote?.id === noteId) {
      setSelectedNote(null)
    }
    if (modalNote?.id === noteId) {
      setIsModalOpen(false)
      setModalNote(null)
    }
    setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: '' })
    
    try {
      const accessToken = await getSessionToken()
      if (!accessToken) {
        throw new Error('Unauthorized')
      }
      
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }
      
      // Success - optimistic update was correct
      console.log('[Notes] Note deleted successfully')
    } catch (error) {
      console.error('Delete failed:', error)
      // Revert optimistic update on error
      setNotes(previousNotes)
      setSelectedNote(previousSelectedNote)
      alert('Failed to delete note. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
      noteId: selectedNote?.id
    }

    const conversationPayload = [...chatMessages, userMessage].map(message => ({
      role: message.type === 'user' ? 'user' : 'assistant',
      content: message.content
    }))

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsChatLoading(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('You must be signed in to use the AI assistant. Please log in again.')
      }

      const response = await fetch('/api/notes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: conversationPayload,
          noteIds: selectedNote ? [selectedNote.id] : undefined
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Chat request failed')
      }

      const aiMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'ai',
        content: data?.message ?? 'No response generated.',
        timestamp: new Date().toISOString(),
        noteId: selectedNote?.id,
        sources: Array.isArray(data?.sources) ? data.sources : undefined
      }

      setChatMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)

      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'ai',
        content: error instanceof Error ? error.message : 'Failed to generate response. Please try again.',
        timestamp: new Date().toISOString(),
        noteId: selectedNote?.id
      }

      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('audio')) return '🎵'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    return '📄'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'processing': return 'text-yellow-600'
      case 'uploading': return 'text-blue-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleDateString()
    } catch {
      return 'N/A'
    }
  }

  // Retry functions for error recovery
  const retryFetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    await fetchNotes(user)
    setLoading(false)
  }, [user, fetchNotes])

  const retryFetchFolders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    await fetchFolders(user)
    setLoading(false)
  }, [user, fetchFolders])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton height={36} width="30%" className="mb-2" />
          <Skeleton height={20} width="50%" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
          <div className="lg:col-span-3 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} height={80} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Error Banners */}
      {notesError && (
        <ErrorBanner
          title="Failed to Load Notes"
          message={notesError}
          onRetry={retryFetchNotes}
          variant="error"
        />
      )}
      {foldersError && (
        <ErrorBanner
          title="Failed to Load Folders"
          message={foldersError}
          onRetry={retryFetchFolders}
          variant="warning"
        />
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Create, manage, and organize your study notes</p>
          {!sidebarOpen && (
            <div className="mt-3 inline-flex items-center space-x-2 rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-medium dark:bg-primary-900/30 dark:text-primary-200">
              <span className="inline-flex h-2.5 w-2.5 rounded-full border border-primary-200 dark:border-primary-700" style={{ backgroundColor: activeFolder?.color ?? '#9ca3af' }} />
              <span>Viewing: {activeFolder?.name ?? 'All notes'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Upload Files
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => {
              setSelectedFolderId(null)
              setSidebarOpen(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Create Note
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      <div className="flex pt-6 gap-6">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'w-80' : 'w-12'
        } bg-white dark:bg-gray-800 shadow-lg rounded-xl transition-all duration-300 flex flex-col border border-gray-200 dark:border-gray-700`}>

          {/* Sidebar Header */}
          <div className={`p-2 border-b border-gray-200 dark:border-gray-700 flex items-center ${sidebarOpen ? 'justify-between pl-2 pr-2' : 'justify-center'}`}>
            <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${sidebarOpen ? 'pl-1' : 'hidden'}`}>
              Saved Notes
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${sidebarOpen ? 'p-2' : 'p-3'}`}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>

          {/* Folder controls */}
          {sidebarOpen && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Folders
                </span>
                <button
                  onClick={() => {
                    if (!canCreateMoreFolders) return
                    setIsCreateFolderOpen(prev => !prev)
                  }}
                  disabled={!canCreateMoreFolders}
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors relative group ${
                    canCreateMoreFolders
                      ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {isCreateFolderOpen ? 'Cancel' : '+ New'}
                  {!canCreateMoreFolders && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Folder limit reached. Delete an existing folder to add a new one.
                    </span>
                  )}
                </button>
              </div>

              {isCreateFolderOpen && canCreateMoreFolders && (
                <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Folder name</label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Biology"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Color</span>
                    <div className="grid grid-cols-5 gap-2">
                      {FOLDER_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewFolderColor(color)}
                          className={`w-7 h-7 rounded-full border-2 ${newFolderColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'} focus:outline-none transition-transform hover:scale-105`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select ${color} color`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateFolder}
                    disabled={isCreatingFolder || newFolderName.trim().length === 0}
                    className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCreatingFolder ? 'Creating...' : 'Create folder'}
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <button
                  onClick={() => handleFolderSelect(null)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedFolderId === null
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-3" />
                  <span className="flex-1 text-left">All notes</span>
                </button>

                {folders.length === 0 && !isCreateFolderOpen && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-1 py-2">No folders yet. Create one to get started.</p>
                )}

                {folders.map(folder => (
                  editingFolderId === folder.id ? (
                    <form
                      key={folder.id}
                      onSubmit={handleFolderRenameSubmit}
                      className="w-full px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
                        <input
                          ref={renameInputRef}
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              handleFolderRenameCancel()
                            }
                          }}
                          className="flex-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Folder name"
                          disabled={isSavingFolderRename}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={handleFolderRenameCancel}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                          disabled={isSavingFolderRename}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={isSavingFolderRename || editingFolderName.trim().length === 0}
                        >
                          {isSavingFolderRename ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      key={folder.id}
                      onClick={() => handleFolderSelect(folder.id)}
                      onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFolderId === folder.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full mr-3" style={{ backgroundColor: folder.color }} />
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      {selectedFolderId === folder.id && (
                        <svg className="w-4 h-4 text-primary-600 dark:text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {sidebarOpen && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notes..."
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {searchTerm && searchTerm === debouncedSearchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className={`flex-1 overflow-y-auto ${!sidebarOpen && 'hidden'}`}>
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {notesError ? (
                  // Error state - already shown in banner above
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm">Unable to load notes</p>
                    <p className="text-xs mt-1">See error message above</p>
                  </div>
                ) : sidebarOpen ? (
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">No notes yet</p>
                    <p className="text-xs mt-1">Upload a file or create a note to get started</p>
                  </div>
                ) : (
                  <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
            ) : (
              <div className="p-2">
                {filteredNotes.map((note) => {
                  const folderColor = note.folder_id
                    ? safeFolders.find(folder => folder.id === note.folder_id)?.color ?? '#9ca3af'
                    : null
                  
                  const isProcessing = note.processing_status === 'pending' || note.processing_status === 'processing'
                  const isFailed = note.processing_status === 'failed'
                  const isClickable = !isProcessing

                  return (
                    <div
                      key={note.id}
                      onClick={() => isClickable && handleViewNote(note)}
                      onContextMenu={(e) => handleContextMenu(e, note.id)}
                      className={`p-3 rounded-lg transition-all duration-200 mb-2 ${
                        isProcessing
                          ? 'opacity-60 cursor-wait bg-gray-100 dark:bg-gray-700/50'
                          : isFailed
                          ? 'cursor-pointer border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                          : selectedNote?.id === note.id
                          ? 'cursor-pointer bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 shadow-sm'
                          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {folderColor && (
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-600"
                            style={{ backgroundColor: folderColor }}
                            aria-hidden
                          />
                        )}
                        {isProcessing && (
                          <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {isFailed && (
                          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <h3 className={`font-medium text-gray-900 dark:text-gray-100 line-clamp-1 ${!sidebarOpen && 'hidden'}`}>
                          {note.title}
                        </h3>
                      </div>
                      {isProcessing && (
                        <p className={`text-xs text-blue-600 dark:text-blue-400 mt-1 ${!sidebarOpen && 'hidden'}`}>
                          Processing file...
                        </p>
                      )}
                      {isFailed && (
                        <p className={`text-xs text-red-600 dark:text-red-400 mt-1 ${!sidebarOpen && 'hidden'}`}>
                          ⚠️ Processing failed
                        </p>
                      )}
                      {!isProcessing && !isFailed && (
                        <p className={`text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1 ${!sidebarOpen && 'hidden'}`}>
                          {note.content}
                        </p>
                      )}
                      <div className={`flex items-center justify-between mt-2 ${!sidebarOpen && 'hidden'}`}>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(note.updated_at)}
                        </div>
                        {note.ocr_processed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Scanned
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
            {/* Recent Files Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Files</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.slice(0, 4).map((note) => {
                  const isProcessing = note.processing_status === 'pending' || note.processing_status === 'processing'
                  const isFailed = note.processing_status === 'failed'
                  const isClickable = !isProcessing
                  
                  return (
                    <div
                      key={note.id}
                      className={`p-4 border rounded-lg transition-all duration-200 ${
                        isProcessing
                          ? 'opacity-60 cursor-wait border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
                          : isFailed
                          ? 'cursor-pointer border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 hover:shadow-md hover:-translate-y-1'
                          : 'cursor-pointer border-gray-200 dark:border-gray-600 hover:shadow-md hover:-translate-y-1'
                      }`}
                      onClick={() => isClickable && handleViewNote(note)}
                      onContextMenu={(e) => handleContextMenu(e, note.id)}
                    >
                      <div className="flex items-center mb-2">
                        {isProcessing ? (
                          <svg className="animate-spin w-5 h-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : isFailed ? (
                          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{note.title}</h3>
                      </div>
                      {isProcessing && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">Processing file...</p>
                      )}
                      {isFailed && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">⚠️ Processing failed</p>
                      )}
                      {!isProcessing && !isFailed && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{note.content}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(note.updated_at)}
                        </div>
                        {note.ocr_processed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Scanned
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredNotes.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No recent files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Files */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Files</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload PDF or DOCX files for AI-powered processing</p>
                </div>
              </div>
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files) {
                    openUploadDialog(Array.from(e.dataTransfer.files))
                  }
                }}
              >
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Drop files here or click to upload</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Automatic text extraction, summarization, and smart tagging
                </p>
                <div className="flex justify-center space-x-4">
                  <label className="bg-gradient-to-br from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg">
                    Choose Files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.docx"
                      onChange={(e) => {
                      if (e.target.files) {
                        openUploadDialog(Array.from(e.target.files))
                        e.target.value = ''
                      }
                    }}
                    />
                  </label>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  <p className="font-medium mb-1">PDF & DOCX files • Max 10MB</p>
                  <p className="text-yellow-600 dark:text-yellow-400">⚠️ Files under 1MB recommended for AI features</p>
                  <p className="mt-2">📄 Text extraction • 🔍 AI-powered search • 🏷️ Smart organization</p>
                </div>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Processing Queue</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-xl mr-3">{getFileIcon(file.type)}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{file.name}</div>
                          <div className={`text-xs ${getStatusColor(file.status)}`}>
                            {file.status === 'completed' ? '✅ AI Processing Complete' : '🤖 Processing...'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create Notes Manually Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Notes Manually</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Craft a new note by hand and save it to your collection</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleClearNoteFields}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleCreateNote}
                    disabled={!newNoteTitle.trim() || isCreating}
                    className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isCreating ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Title</label>
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter note title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                  <textarea
                    rows={8}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Write your note content here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to folder</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(null)}
                      className={`px-3 py-1.5 text-sm rounded-full border ${selectedFolderId === null ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-200' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400'}`}
                    >
                      All notes
                    </button>
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`px-3 py-1.5 text-sm rounded-full border ${selectedFolderId === folder.id ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-200' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400'}`}
                      >
                        <span className="inline-flex items-center space-x-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
                          <span>{folder.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

        </div>

        {/* AI Chat Panel */}
        <AIChatPanel 
          messages={chatMessages}
          input={chatInput}
          isLoading={isChatLoading}
          onInputChange={setChatInput}
          onSendMessage={handleSendMessage}
          selectedNoteName={selectedNote?.title}
        />
      </div>

      <UploadFolderDialog
        isOpen={isUploadDialogOpen}
        folders={folders.map(folder => ({ id: folder.id, name: folder.name, color: folder.color }))}
        onCancel={handleUploadDialogCancel}
        onSelectFolder={handleUploadDialogSelect}
        canCreateFolder={folders.length < FOLDER_LIMIT}
        folderColors={FOLDER_COLORS}
        onCreateFolder={folders.length < FOLDER_LIMIT ? handleUploadCreateFolder : undefined}
      />

      {folderContextMenu && (
        <FolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          onClose={() => setFolderContextMenu(null)}
          onRename={() => handleFolderRenameStart(folderContextMenu.folder)}
          onDelete={() => {
            setFolderDeleteConfirm({ isOpen: true, folder: folderContextMenu.folder })
            setFolderContextMenu(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={folderDeleteConfirm.isOpen}
        title="Delete Folder"
        message={folderDeleteConfirm.folder ? `Are you sure you want to delete the folder "${folderDeleteConfirm.folder.name}"? Notes inside will remain accessible under All notes.` : ''}
        confirmText={isDeletingFolder ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={() => {
          if (folderDeleteConfirm.folder) {
            void handleFolderDelete(folderDeleteConfirm.folder)
          }
        }}
        onCancel={() => {
          if (!isDeletingFolder) {
            setFolderDeleteConfirm({ isOpen: false, folder: null })
          }
        }}
        isDestructive
      />

      {/* Note Modal */}
      <NoteModal 
        note={modalNote}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDeleted={handleNoteDeleted}
        folders={folders}
        onUpdated={handleNoteUpdated}
      />

      {/* Context Menu */}
      {contextMenu && (() => {
        const note = notes.find(n => n.id === contextMenu.noteId)
        return (
          <NoteContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onDelete={() => handleDeleteClick(contextMenu.noteId)}
            onClose={() => setContextMenu(null)}
            folders={folders}
            currentFolderId={note?.folder_id ?? null}
            onMove={(folderId) => handleMoveNote(contextMenu.noteId, folderId)}
            processingStatus={note?.processing_status}
            onRetry={() => retryNoteProcessing(contextMenu.noteId)}
          />
        )
      })()}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete note?"
        message={`Are you sure you want to delete "${deleteConfirm.noteTitle}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: '' })}
        isDestructive
      />

      {/* File Size Warning */}
      <FileSizeWarningDialog
        isOpen={fileSizeWarning.isOpen}
        fileName={fileSizeWarning.file?.name ?? ''}
        fileSize={fileSizeWarning.file?.size ?? 0}
        maxSize={OCR_SIZE_LIMIT}
        onConfirm={handleFileSizeWarningConfirm}
        onCancel={handleFileSizeWarningCancel}
      />

      {/* OCR Premium Gate */}
      <OcrPremiumDialog
        isOpen={ocrWarning.isOpen}
        fileName={ocrWarning.file?.name ?? ''}
        onClose={handleOcrWarningCancel}
        onProceed={handleOcrWarningProceed}
      />
    </div>
  )
}