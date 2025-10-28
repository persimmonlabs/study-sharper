import { JSONContent } from '@tiptap/core'

/**
 * Convert HTML string to Tiptap JSON format
 * Parses HTML and builds a ProseMirror-compatible JSON structure
 */
export function htmlToJSON(html: string): JSONContent {
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
  
  const content: JSONContent[] = []
  
  // Process all child nodes
  doc.body.childNodes.forEach((node) => {
    const jsonNode = parseNode(node)
    if (jsonNode) {
      content.push(jsonNode)
    }
  })

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
}

/**
 * Parse a DOM node and convert to Tiptap JSON
 */
function parseNode(node: Node): JSONContent | null {
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

/**
 * Parse all children of an element
 */
function parseChildren(element: Element): JSONContent[] {
  const content: JSONContent[] = []

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

/**
 * Detect if content is HTML or markdown
 */
export function isHTML(content: string): boolean {
  if (!content) return false
  // Simple heuristic: if it contains HTML tags, treat as HTML
  return /<[a-z][\s\S]*>/i.test(content)
}
