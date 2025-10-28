'use client'

/**
 * Enhanced HTML to Tiptap JSON parser with full formatting support
 * Preserves: font sizes, colors, fonts, alignment, underlines, highlights, line breaks
 */

// Helper function to detect if content is HTML
export function isHTML(content: string): boolean {
  if (!content) return false
  const result = /<[a-z][\s\S]*>/i.test(content)
  console.log('[htmlParser] isHTML check:', result, 'content preview:', content.substring(0, 100))
  return result
}

// Parse inline style attribute and extract formatting properties
function parseStyleAttribute(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {}
  if (!styleStr) return styles

  styleStr.split(';').forEach((rule) => {
    const [key, value] = rule.split(':').map((s) => s.trim())
    if (key && value) {
      styles[key] = value
    }
  })

  return styles
}

// Convert style object to Tiptap marks
function getMarksFromStyles(styles: Record<string, string>): any[] {
  const marks: any[] = []

  if (styles['font-size']) {
    marks.push({
      type: 'fontSize',
      attrs: { fontSize: styles['font-size'] },
    })
  }

  if (styles['color']) {
    marks.push({
      type: 'color',
      attrs: { color: styles['color'] },
    })
  }

  if (styles['background-color']) {
    marks.push({
      type: 'highlight',
      attrs: { color: styles['background-color'] },
    })
  }

  if (styles['font-family']) {
    marks.push({
      type: 'fontFamily',
      attrs: { fontFamily: styles['font-family'] },
    })
  }

  if (styles['text-decoration'] && styles['text-decoration'].includes('underline')) {
    marks.push({ type: 'underline' })
  }

  return marks
}

// Get text alignment from style
function getTextAlignFromStyles(styles: Record<string, string>): string | undefined {
  const align = styles['text-align']
  if (align && ['left', 'center', 'right', 'justify'].includes(align)) {
    return align
  }
  return undefined
}

// Helper function to convert HTML to Tiptap JSON format
export function htmlToJSON(html: string) {
  console.log('[htmlParser] Converting HTML:', html.substring(0, 150))

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

  // Check if DOMParser is available (client-side only)
  if (typeof DOMParser === 'undefined') {
    console.error('[htmlParser] DOMParser not available - running on server?')
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: html }],
        },
      ],
    }
  }

  // Create a temporary DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const content: any[] = []

  // Process all child nodes from body
  if (doc.body) {
    doc.body.childNodes.forEach((node) => {
      const jsonNode = parseNode(node)
      if (jsonNode) {
        content.push(jsonNode)
      }
    })
  }

  const result = {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
  console.log('[htmlParser] Result:', JSON.stringify(result).substring(0, 200))
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
  const styles = parseStyleAttribute(element.getAttribute('style') || '')
  const textAlign = getTextAlignFromStyles(styles)

  switch (tagName) {
    case 'p':
      return {
        type: 'paragraph',
        attrs: textAlign ? { textAlign } : undefined,
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
        attrs: { level, ...(textAlign ? { textAlign } : {}) },
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
        type: 'hardBreak',
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

    case 'span':
      // Span with inline styles - treat as text with marks
      const spanChildren = parseChildren(element)
      if (spanChildren.length === 0) return null
      return {
        type: 'paragraph',
        content: spanChildren,
      }

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
      const styles = parseStyleAttribute(child.getAttribute('style') || '')
      const styleMarks = getMarksFromStyles(styles)

      // Handle inline formatting
      if (tagName === 'strong' || tagName === 'b') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'bold' }, ...styleMarks],
        })
      } else if (tagName === 'em' || tagName === 'i') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'italic' }, ...styleMarks],
        })
      } else if (tagName === 'code') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'code' }, ...styleMarks],
        })
      } else if (tagName === 'a') {
        const text = child.textContent || ''
        const href = child.getAttribute('href') || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href } }, ...styleMarks],
        })
      } else if (tagName === 'u') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'underline' }, ...styleMarks],
        })
      } else if (tagName === 's' || tagName === 'del') {
        const text = child.textContent || ''
        content.push({
          type: 'text',
          text,
          marks: [{ type: 'strike' }, ...styleMarks],
        })
      } else if (tagName === 'br') {
        content.push({
          type: 'hardBreak',
        })
      } else if (tagName === 'span') {
        // Span with inline styles
        const spanText = child.textContent || ''
        if (spanText) {
          content.push({
            type: 'text',
            text: spanText,
            marks: styleMarks.length > 0 ? styleMarks : undefined,
          })
        }
      } else {
        // Recursively parse nested elements
        const childContent = parseChildren(child)
        content.push(...childContent)
      }
    }
  })

  return content
}
