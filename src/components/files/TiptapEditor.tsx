'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import HardBreak from '@tiptap/extension-hard-break'
import { useEffect, useCallback } from 'react'
import { markdownToJSON, jsonToMarkdown } from '@/lib/markdown-converter'
import { FontSizeMarkFixed } from './extensions/FontSizeMarkFixed'
import { ColorMark } from './extensions/ColorMark'
import { FontFamilyMarkFixed } from './extensions/FontFamilyMarkFixed'
import { StrikethroughMark } from './extensions/StrikethroughMark'
import { SubscriptMark } from './extensions/SubscriptMark'
import { SuperscriptMark } from './extensions/SuperscriptMark'
import { LineHeightExtension } from './extensions/LineHeightExtension'
import { LetterSpacingMark } from './extensions/LetterSpacingMark'
import { FontWeightMark } from './extensions/FontWeightMark'
import { TextDecorationMark } from './extensions/TextDecorationMark'
import { TextShadowMark } from './extensions/TextShadowMark'
import { FontStyleMark } from './extensions/FontStyleMark'
import { MarginPaddingExtension } from './extensions/MarginPaddingExtension'
import { PasteHandler } from './extensions/PasteHandler'
import { isHTML, htmlToJSON } from './html-parser-v2'
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

interface TiptapEditorProps {
  markdown: string
  onChange: (content: string) => void
  disabled?: boolean
}

// All HTML parsing functions moved to html-parser.ts module

export function TiptapEditor({ markdown, onChange, disabled = false }: TiptapEditorProps) {
  console.log('[TiptapEditor] Received markdown:', markdown.substring(0, 200))
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          languageClassPrefix: 'language-',
        },
        hardBreak: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ColorMark,
      FontFamilyMarkFixed,
      FontSizeMarkFixed,
      StrikethroughMark,
      SubscriptMark,
      SuperscriptMark,
      LetterSpacingMark,
      FontWeightMark,
      TextDecorationMark,
      TextShadowMark,
      FontStyleMark,
      MarginPaddingExtension,
      PasteHandler,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      HardBreak,
    ],
    content: (() => {
      const isHtml = isHTML(markdown)
      console.log('[TiptapEditor] Converting with:', isHtml ? 'htmlToJSON' : 'markdownToJSON')
      return isHtml ? htmlToJSON(markdown) : markdownToJSON(markdown)
    })(),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange(JSON.stringify(json))
    },
  })

  useEffect(() => {
    if (!editor || !markdown) return
    
    try {
      let content
      
      if (markdown.startsWith('{')) {
        content = JSON.parse(markdown)
      } else {
        const isHtml = isHTML(markdown)
        console.log('[TiptapEditor] useEffect: Converting with:', isHtml ? 'htmlToJSON' : 'markdownToJSON')
        content = isHtml ? htmlToJSON(markdown) : markdownToJSON(markdown)
      }
      
      const currentJson = JSON.stringify(editor.getJSON())
      const newJson = JSON.stringify(content)
      
      if (currentJson !== newJson) {
        console.log('[TiptapEditor] Setting content:', content)
        editor.commands.setContent(content)
      }
    } catch (e) {
      console.error('[TiptapEditor] Error parsing content:', e)
    }
  }, [markdown, editor])

  if (!editor) {
    return <div className="flex h-full min-h-0 items-center justify-center text-gray-500">Loading editor...</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 min-h-0 overflow-y-auto" />
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
