'use client'

import { useState, useRef, useEffect } from 'react'
import { FileItem } from '@/types/files'
import { Send, X, Loader2, MessageCircle, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    file_id: string
    file_title: string
    chunk_id: string
    similarity: number
    text: string
  }>
  timestamp: string
}

interface FileChatInterfaceProps {
  selectedFile?: FileItem | null
  selectedFileIds?: string[]
  onClose?: () => void
}

export function FileChatInterface({
  selectedFile,
  selectedFileIds = [],
  onClose
}: FileChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Get file IDs to chat with
  const getChatFileIds = (): string[] => {
    if (selectedFileIds.length > 0) return selectedFileIds
    if (selectedFile?.id) return [selectedFile.id]
    return []
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const fileIds = getChatFileIds()
    if (fileIds.length === 0) {
      setError('Please select a file to chat with')
      return
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    abortControllerRef.current = new AbortController()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/chat/with-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: input.trim(),
          file_ids: fileIds
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get response')
      }

      const data = await response.json()

      // Update session ID if new
      if (!sessionId && data.session_id) {
        setSessionId(data.session_id)
      }

      const assistantMessage: ChatMessage = {
        id: data.message_id,
        role: 'assistant',
        content: data.response,
        sources: data.sources || [],
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
        console.error('Chat error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatSimilarity = (similarity: number | undefined) => {
    if (!similarity) return 'N/A'
    return `${(similarity * 100).toFixed(0)}%`
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-slate-900 dark:text-gray-100">Chat with Files</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* File Context */}
      {(selectedFile || selectedFileIds.length > 0) && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            {selectedFileIds.length > 1
              ? `Chatting with ${selectedFileIds.length} files`
              : selectedFile
              ? `Chatting with: ${selectedFile.title}`
              : 'Select a file to chat'}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 dark:text-gray-600 mb-3" />
            <p className="text-slate-500 dark:text-gray-400">
              Start a conversation about your files
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-300 dark:border-gray-700 space-y-2">
                  <p className="text-xs font-semibold opacity-75">Sources:</p>
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded ${
                        message.role === 'user'
                          ? 'bg-blue-700 opacity-75'
                          : 'bg-slate-200 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{source.file_title}</p>
                          <p className="opacity-75 line-clamp-2">{source.text}</p>
                          <p className="opacity-60 mt-1">
                            Match: {formatSimilarity(source.similarity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 text-slate-600 dark:text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-gray-700 space-y-3">
        {!selectedFile && selectedFileIds.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Select a file from the list to start chatting
          </p>
        )}

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the file..."
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 placeholder-slate-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isLoading || (selectedFileIds.length === 0 && !selectedFile)}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || (selectedFileIds.length === 0 && !selectedFile)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
