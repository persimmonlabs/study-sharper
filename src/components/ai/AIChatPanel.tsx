'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  noteId?: string
  sources?: Array<{ id: string; title: string }>
}

interface AIChatPanelProps {
  messages: ChatMessage[]
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSendMessage: () => void
  selectedNoteName?: string
}

export function AIChatPanel({ 
  messages, 
  input, 
  isLoading, 
  onInputChange, 
  onSendMessage,
  selectedNoteName 
}: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSendMessage()
      }
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
      isOpen ? 'w-96' : 'w-14'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {isOpen ? (
          <>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg mr-3">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedNoteName ? `Chatting about: ${selectedNoteName}` : 'Ask me anything'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Collapse chat"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Expand chat"
          >
            <div className="text-2xl">🤖</div>
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">💡</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  AI Study Assistant
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                  Ask questions about your notes, get explanations, or request study tips!
                </p>
                <div className="mt-4 space-y-2 w-full">
                  <button
                    onClick={() => {
                      onInputChange("Summarize my notes")
                      inputRef.current?.focus()
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    💡 Summarize my notes
                  </button>
                  <button
                    onClick={() => {
                      onInputChange("Create quiz questions")
                      inputRef.current?.focus()
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    🧠 Create quiz questions
                  </button>
                  <button
                    onClick={() => {
                      onInputChange("Explain key concepts")
                      inputRef.current?.focus()
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    📚 Explain key concepts
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                          <p className="text-xs opacity-75 mb-1">Sources:</p>
                          {message.sources.map((source) => (
                            <div key={source.id} className="text-xs opacity-75">
                              • {source.title}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                disabled={isLoading}
              />
              <button
                onClick={onSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  )
}
