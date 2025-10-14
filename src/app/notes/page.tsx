'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import type { FormEvent, MouseEvent, ChangeEvent } from 'react'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { NoteModal } from '@/components/notes/NoteModal'
import { NoteContextMenu } from '@/components/notes/NoteContextMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileSizeWarningDialog } from '@/components/ui/FileSizeWarningDialog'
import { FolderContextMenu } from '@/components/notes/FolderContextMenu'
import { UploadFolderDialog } from '@/components/ui/UploadFolderDialog'
import { AIChatPanel } from '@/components/ai/AIChatPanel'
import type { User } from '@supabase/supabase-js'

type Note = Database['public']['Tables']['notes']['Row'] & {
  summary?: string
  tags?: string[]
  file_type?: string
  transcription?: string
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

// Helper function to get session token
const getSessionToken = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[Notes] Session error:', error)
      return null
    }
    return session?.access_token || null
  } catch (error) {
    console.error('[Notes] Failed to get session:', error)
    return null
  }
}

export default function Notes() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
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
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canCreateMoreFolders = folders.length < FOLDER_LIMIT

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null
    return folders.find(folder => folder.id === selectedFolderId) ?? null
  }, [folders, selectedFolderId])

  // OCR file size limit (1MB = 1024 * 1024 bytes)
  const OCR_SIZE_LIMIT = 1024 * 1024

  const fetchFolders = useCallback(async (currentUser: User): Promise<boolean> => {
    console.log('[fetchFolders] Starting folder fetch for user:', currentUser.id)
    try {
      const accessToken = await getSessionToken()
      
      if (!accessToken) {
        console.warn('[fetchFolders] No session token available')
        setFolders([])
        return true // Continue even without token - don't block the page
      }
      
      console.log('[fetchFolders] Making request to /api/folders')
      
      const response = await fetch('/api/folders', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(err => {
        console.warn('[fetchFolders] Fetch error:', err.message)
        return null
      })
      
      if (!response) {
        console.warn('[fetchFolders] No response - backend may be down')
        setFolders([])
        return true // Continue without folders
      }
      
      console.log('[fetchFolders] Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('[Notes] Unauthorized - redirecting to login')
          router.push('/auth/login?next=/notes')
          return false
        }
        
        console.warn('[fetchFolders] Non-OK response, using empty folders')
        setFolders([])
        return true
      }
      
      const data = await response.json() as NoteFolder[]
      
      setFolders(data || [])
      setSelectedFolderId(prev => {
        if (!prev) return prev
        return data?.some((folder: NoteFolder) => folder.id === prev) ? prev : null
      })
      
      if (folders.length >= FOLDER_LIMIT) {
        setIsCreateFolderOpen(false)
      }
      return true
    } catch (error) {
      console.error('[fetchFolders] Error:', error)
      setFolders([])
      return true // Always return true to prevent hanging
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

  const fetchNotes = useCallback(async (currentUser: User): Promise<boolean> => {
    console.log('[fetchNotes] Starting notes fetch for user:', currentUser.id)
    try {
      const accessToken = await getSessionToken()
      
      if (!accessToken) {
        console.warn('[fetchNotes] No session token available')
        setNotes([])
        setAvailableTags([])
        setSelectedNote(null)
        return true // Continue even without token
      }
      
      console.log('[fetchNotes] Making request to /api/notes')
      
      const response = await fetch('/api/notes', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(err => {
        console.warn('[fetchNotes] Fetch error:', err.message)
        return null
      })
      
      if (!response) {
        console.warn('[fetchNotes] No response - backend may be down')
        setNotes([])
        setAvailableTags([])
        setSelectedNote(null)
        return true // Continue without notes
      }
      
      console.log('[fetchNotes] Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('[Notes] Unauthorized - redirecting to login')
          router.push('/auth/login?next=/notes')
          return false
        }
        
        console.warn('[fetchNotes] Non-OK response, using empty notes')
        setNotes([])
        setAvailableTags([])
        setSelectedNote(null)
        return true
      }
      
      const data = await response.json() as Note[]
      
      setNotes(data || [])
      setSelectedNote(prev => (prev && data?.some(note => note.id === prev.id)) ? prev : (data?.[0] ?? null))

      const uniqueTags = new Set<string>()
      data?.forEach((note: Note) => {
        note.tags?.forEach((tag: string) => uniqueTags.add(tag))
      })
      setAvailableTags(Array.from(uniqueTags).sort())
      return true
    } catch (error) {
      console.error('[fetchNotes] Error:', error)
      setNotes([])
      setAvailableTags([])
      setSelectedNote(null)
      return true // Always return true to prevent hanging
    }
  }, [router])

  // Load data when user is available
  // Optimized: Fetch notes and folders in parallel using Promise.all
  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        console.log('[Notes] Starting parallel data load...')
        const startTime = Date.now()
        
        // Fetch notes and folders in parallel for faster loading
        await Promise.all([
          fetchNotes(user),
          fetchFolders(user)
        ])
        
        const loadTime = Date.now() - startTime
        console.log(`[Notes] Data loaded in ${loadTime}ms`)
        setLoading(false)
      } catch (error) {
        console.error('[Notes] Error during data load:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [user, authLoading, fetchNotes, fetchFolders])

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Note: content field is not available in lightweight notes
      // Search only by title and tags for performance
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))

      const matchesTags = selectedTags.length === 0 ||
        (note.tags && selectedTags.every(tag => note.tags?.includes(tag)))

      const matchesFolder = !selectedFolderId || note.folder_id === selectedFolderId

      return matchesSearch && matchesTags && matchesFolder
    })
  }, [notes, searchTerm, selectedTags, selectedFolderId])

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

      // File is within size limit, proceed normally
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

    setIsDeleting(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Unauthorized')
      }
      const response = await fetch(`/api/notes/${deleteConfirm.noteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Close modal if deleted note was open
      if (modalNote?.id === deleteConfirm.noteId) {
        setIsModalOpen(false)
        setModalNote(null)
      }

      // Refresh notes
      await fetchNotes(user)

      setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: '' })
    } catch (error) {
      console.error('Delete failed:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading notes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
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
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {/* Notes List */}
          <div className={`flex-1 overflow-y-auto ${!sidebarOpen && 'hidden'}`}>
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {sidebarOpen ? (
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No notes yet</p>
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
                    ? folders.find(folder => folder.id === note.folder_id)?.color ?? '#9ca3af'
                    : null

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleViewNote(note)}
                      onContextMenu={(e) => handleContextMenu(e, note.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                        selectedNote?.id === note.id
                          ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 shadow-sm'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:shadow-sm'
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
                        <h3 className={`font-medium text-gray-900 dark:text-gray-100 line-clamp-1 ${!sidebarOpen && 'hidden'}`}>
                          {note.title}
                        </h3>
                      </div>
                      <p className={`text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1 ${!sidebarOpen && 'hidden'}`}>
                        {note.content}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatDate(note.updated_at)}
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
                {filteredNotes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                    onClick={() => handleViewNote(note)}
                    onContextMenu={(e) => handleContextMenu(e, note.id)}
                  >
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{note.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{note.content}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formatDate(note.updated_at)}
                    </div>
                  </div>
                ))}
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
      {contextMenu && (
        <NoteContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => handleDeleteClick(contextMenu.noteId)}
          onClose={() => setContextMenu(null)}
          folders={folders}
          currentFolderId={notes.find(note => note.id === contextMenu.noteId)?.folder_id ?? null}
          onMove={(folderId) => handleMoveNote(contextMenu.noteId, folderId)}
        />
      )}

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
    </div>
  )
}