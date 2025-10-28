'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect, useCallback } from 'react'
import { markdownToJSON, jsonToMarkdown } from '@/lib/markdown-converter'
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react'
import './tiptap-editor.css'

// Helper function to detect if content is HTML
function isHTML(content: string): boolean {
  if (!content) return false
  // Check if string contains HTML tags
  const result = /<[a-z][\s\S]*>/i.test(content)
  console.log('[TiptapEditor] isHTML check:', result, 'content preview:', content.substring(0, 100))
  return result
}

// Helper function to convert HTML to Tiptap JSON format
function htmlToJSON(html: string) {
  console.log('[htmlToJSON] Converting HTML:', html.substring(0, 150))
  
  if (!html || !html.trim()) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }
  }

  // Create a temporary DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const content: any[] = []
  
  // Process all child nodes
  doc.body.childNodes.forEach((node) => {
    const jsonNode = parseNode(node)
    if (jsonNode) {
      content.push(jsonNode)
    }
  })

  const result = {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
  console.log('[htmlToJSON] Result:', result)
  return result
}

// Parse a DOM node and convert to Tiptap JSON
function parseNode(node: Node): any | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim()
    if (text) {
      return {
        type: 'text',
        text,
      }
    }
    return null
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case 'p':
      return {
        type: 'paragraph',
        content: parseChildren(element),
      }

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      const level = parseInt(tagName[1])
      return {
        type: 'heading',
        attrs: { level },
        content: parseChildren(element),
      }

    case 'ul':
      return {
        type: 'bulletList',
        content: Array.from(element.children)
          .filter((child) => child.tagName.toLowerCase() === 'li')
          .map((li) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: parseChildren(li as Element),
              },
            ],
          })),
      }

    case 'ol':
      return {
        type: 'orderedList',
        content: Array.from(element.children)
          .filter((child) => child.tagName.toLowerCase() === 'li')
          .map((li) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: parseChildren(li as Element),
              },
            ],
          })),
      }

    case 'blockquote':
      return {
        type: 'blockquote',
        content: parseChildren(element),
      }

    case 'pre':
    case 'code':
      const codeContent = element.textContent || ''
      return {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: codeContent }],
      }

    case 'hr':
      return {
        type: 'horizontalRule',
      }

    case 'br':
      return {
        type: 'text',
        text: '\n',
      }

    // Skip wrapper elements, process children
    case 'div':
    case 'section':
    case 'article':
      const children = parseChildren(element)
      return children.length > 0
        ? {
            type: 'paragraph',
            content: children,
          }
        : null

    default:
      // For unknown tags, try to parse as paragraph
      return {
        type: 'paragraph',
        content: parseChildren(element),
      }
  }
}

// Parse all children of an element
function parseChildren(element: Element): any[] {
  const content: any[] = []

  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        content.push({
          type: 'text',
          text,
        })
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element
      const tagName = child.tagName.toLowerCase()

      // Handle inline formatting
      if (tagName === 'strong' || tagName === 'b') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'bold' }],
        })
      } else if (tagName === 'em' || tagName === 'i') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'italic' }],
        })
      } else if (tagName === 'code') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'code' }],
        })
      } else if (tagName === 'a') {
        const text = child.textContent || ''
        const href = child.getAttribute('href') || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href } }],
        })
      } else if (tagName === 'u') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'underline' }],
        })
      } else if (tagName === 's' || tagName === 'del') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'strike' }],
        })
      } else {
        // Recursively parse nested elements
        const childContent = parseChildren(child)
        content.push(...childContent)
      }
    }
  })

  return content
}

interface TiptapEditorProps {
  markdown: string
  onChange: (markdown: string) => void
  disabled?: boolean
}

export function TiptapEditor({ markdown, onChange, disabled = false }: TiptapEditorProps) {
  console.log('[TiptapEditor] Received markdown:', markdown.substring(0, 200))
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          languageClassPrefix: 'language-',
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: (() => {
      const isHtml = isHTML(markdown)
      console.log('[TiptapEditor] Converting with:', isHtml ? 'htmlToJSON' : 'markdownToJSON')
      return isHtml ? htmlToJSON(markdown) : markdownToJSON(markdown)
    })(),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const md = jsonToMarkdown(json)
      onChange(md)
    },
  })

  useEffect(() => {
    if (editor && markdown !== jsonToMarkdown(editor.getJSON())) {
      const isHtml = isHTML(markdown)
      console.log('[TiptapEditor] useEffect: Converting with:', isHtml ? 'htmlToJSON' : 'markdownToJSON')
      const content = isHtml ? htmlToJSON(markdown) : markdownToJSON(markdown)
      console.log('[TiptapEditor] Setting content:', content)
      editor.commands.setContent(content)
    }
  }, [markdown, editor])

  if (!editor) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading editor...</div>
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}

interface ToolbarProps {
  editor: Editor | null
}

type EditorType = Editor | null

function Toolbar({ editor }: { editor: EditorType }) {
  if (!editor) return null

  const buttonClass =
    'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const activeButtonClass =
    'p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 transition-colors'

  const isActive = (name: string, attrs?: Record<string, any>) => {
    return editor.isActive(name, attrs)
  }

  const toggleMark = (name: string) => {
    editor.chain().focus().toggleMark(name).run()
  }

  const toggleBlock = (name: string, attrs?: Record<string, any>) => {
    editor.chain().focus().toggleNode(name, 'paragraph', attrs).run()
  }

  const addLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 flex flex-wrap gap-1">
      {/* Undo/Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={buttonClass}
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={buttonClass}
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Text Formatting */}
      <button
        onClick={() => toggleMark('bold')}
        className={isActive('bold') ? activeButtonClass : buttonClass}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => toggleMark('italic')}
        className={isActive('italic') ? activeButtonClass : buttonClass}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => toggleMark('code')}
        className={isActive('code') ? activeButtonClass : buttonClass}
        title="Inline Code"
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Headings */}
      <button
        onClick={() => toggleBlock('heading', { level: 1 })}
        className={isActive('heading', { level: 1 }) ? activeButtonClass : buttonClass}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => toggleBlock('heading', { level: 2 })}
        className={isActive('heading', { level: 2 }) ? activeButtonClass : buttonClass}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => toggleBlock('heading', { level: 3 })}
        className={isActive('heading', { level: 3 }) ? activeButtonClass : buttonClass}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={isActive('bulletList') ? activeButtonClass : buttonClass}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={isActive('orderedList') ? activeButtonClass : buttonClass}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Other */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={isActive('blockquote') ? activeButtonClass : buttonClass}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={buttonClass}
        title="Horizontal Rule"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button onClick={addLink} className={buttonClass} title="Add Link">
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
