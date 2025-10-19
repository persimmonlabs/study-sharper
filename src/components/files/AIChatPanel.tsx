'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileItem } from '@/types/files'
import { Send, X, Trash2, FileText, Loader2, Sparkles } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  message: string
  timestamp: string
  sources?: Array<{ id: string; title: string; type?: string }>
  fileContext?: { id: string; title: string }
}

interface AIChatPanelProps {
  selectedFile: FileItem | null
  onClose: () => void
  onFileReference?: (fileId: string) => void
}

export function AIChatPanel({ selectedFile, onClose, onFileReference }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const clearChat = () => {
    if (confirm('Clear all chat history?')) {
      setMessages([])
      setStreamingMessage('')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      message: input.trim(),
      timestamp: new Date().toISOString(),
      fileContext: selectedFile ? { id: selectedFile.id, title: selectedFile.title } : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingMessage('')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Build context from selected file
      const fileContext = selectedFile?.content
        ? `Current file: ${selectedFile.title}\n\nContent:\n${selectedFile.content.substring(0, 3000)}`
        : undefined

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          prompt: input.trim(),
          chatbot_type: 'general_assistant',
          conversation_history: messages.map(m => ({
            role: m.role,
            message: m.message,
            timestamp: m.timestamp
          })),
          context: fileContext
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      // Handle streaming if supported
      if (data.stream) {
        // Simulated streaming for now - replace with actual SSE if backend supports it
        const fullMessage = data.message
        let currentIndex = 0
        const streamInterval = setInterval(() => {
          if (currentIndex < fullMessage.length) {
            const chunkSize = Math.min(5, fullMessage.length - currentIndex)
            setStreamingMessage(prev => prev + fullMessage.substring(currentIndex, currentIndex + chunkSize))
            currentIndex += chunkSize
          } else {
            clearInterval(streamInterval)
            setIsStreaming(false)
            
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              message: fullMessage,
              timestamp: new Date().toISOString(),
              sources: data.sources,
              fileContext: selectedFile ? { id: selectedFile.id, title: selectedFile.title } : undefined
            }
            setMessages(prev => [...prev, assistantMessage])
            setStreamingMessage('')
          }
        }, 20)
      } else {
        // Non-streaming response
        setIsStreaming(false)
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          message: data.message,
          timestamp: new Date().toISOString(),
          sources: data.sources,
          fileContext: selectedFile ? { id: selectedFile.id, title: selectedFile.title } : undefined
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled')
      } else {
        console.error('Chat error:', error)
        const errorMessage: ChatMessage = {
          role: 'assistant',
          message: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
      setIsStreaming(false)
      setStreamingMessage('')
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileReferenceClick = (fileId: string) => {
    onFileReference?.(fileId)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
          {selectedFile && (
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
              Context: {selectedFile.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-2">Ask me anything about your files</p>
              <p className="text-xs text-gray-400">
                {selectedFile 
                  ? `I have context from: ${selectedFile.title}`
                  : 'Select a file to give me context'}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm">{msg.message}</div>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                  <p className="text-xs font-medium text-gray-600">Sources:</p>
                  {msg.sources.map((source, i) => (
                    <button
                      key={i}
                      onClick={() => handleFileReferenceClick(source.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      {source.title}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="mt-1 text-xs opacity-70">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isStreaming && streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2 text-gray-900">
              <div className="whitespace-pre-wrap break-words text-sm">
                {streamingMessage}
                <span className="inline-block h-4 w-1 animate-pulse bg-gray-600 ml-1" />
              </div>
            </div>
          </div>
        )}

        {isLoading && !isStreaming && !streamingMessage && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? `Ask about ${selectedFile.title}...` : 'Ask me anything...'}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center self-end rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
