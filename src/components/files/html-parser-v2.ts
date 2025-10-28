'use client'

/**
 * Simplified HTML to Tiptap JSON parser
 * Focus: Get content rendering first, then add formatting
 */

export function isHTML(content: string): boolean {
  if (!content) return false
  const result = /<[a-z][\s\S]*>/i.test(content)
  console.log('[htmlParser] isHTML:', result)
  return result
}

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

function getMarksFromStyles(styles: Record<string, string>): any[] {
  const marks: any[] = []

  if (styles['font-size']) {
    marks.push({
      type: 'fontSizeFixed',
      attrs: { fontSize: styles['font-size'] },
    })
  }

  if (styles['color']) {
    marks.push({
      type: 'colorMark',
      attrs: { color: styles['color'] },
    })
  }

  if (styles['font-family']) {
    marks.push({
      type: 'fontFamilyFixed',
      attrs: { fontFamily: styles['font-family'] },
    })
  }

  if (styles['background-color']) {
    marks.push({
      type: 'highlight',
      attrs: { color: styles['background-color'] },
    })
  }

  // Priority 1 & 2 features
  if (styles['text-decoration'] && styles['text-decoration'].includes('line-through')) {
    marks.push({
      type: 'strikethroughMark',
      attrs: { strikethrough: true },
    })
  }

  if (styles['vertical-align'] === 'sub') {
    marks.push({
      type: 'subscriptMark',
      attrs: { subscript: true },
    })
  }

  if (styles['vertical-align'] === 'super') {
    marks.push({
      type: 'superscriptMark',
      attrs: { superscript: true },
    })
  }

  if (styles['letter-spacing']) {
    marks.push({
      type: 'letterSpacingMark',
      attrs: { letterSpacing: styles['letter-spacing'] },
    })
  }

  if (styles['font-weight'] && styles['font-weight'] !== 'normal' && styles['font-weight'] !== '400') {
    marks.push({
      type: 'fontWeightMark',
      attrs: { fontWeight: styles['font-weight'] },
    })
  }

  if (styles['text-decoration'] && !styles['text-decoration'].includes('none')) {
    marks.push({
      type: 'textDecorationMark',
      attrs: { textDecoration: styles['text-decoration'] },
    })
  }

  // Priority 3 features
  if (styles['text-shadow']) {
    marks.push({
      type: 'textShadowMark',
      attrs: { textShadow: styles['text-shadow'] },
    })
  }

  if (styles['font-style'] && styles['font-style'] !== 'normal') {
    marks.push({
      type: 'fontStyleMark',
      attrs: { fontStyle: styles['font-style'] },
    })
  }

  return marks
}

export function htmlToJSON(html: string) {
  console.log('[htmlParser] Starting conversion, length:', html.length)

  if (!html || !html.trim()) {
    console.log('[htmlParser] Empty HTML, returning empty doc')
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    }
  }

  // Check if DOMParser is available
  if (typeof DOMParser === 'undefined') {
    console.error('[htmlParser] DOMParser not available')
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Error: DOMParser not available' }],
        },
      ],
    }
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    if (!doc || !doc.body) {
      console.error('[htmlParser] Failed to parse HTML')
      return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: html }] }],
      }
    }

    const content = parseElements(doc.body.childNodes)
    console.log('[htmlParser] Parsed content nodes:', content.length)

    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
    }
  } catch (error) {
    console.error('[htmlParser] Error parsing HTML:', error)
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: html }] }],
    }
  }
}

function parseElements(nodes: NodeListOf<ChildNode>): any[] {
  const result: any[] = []
  let pendingText: any[] = []

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        pendingText.push({
          type: 'text',
          text,
        })
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      // If we have pending text and encounter a block element, flush it
      if (pendingText.length > 0 && isBlockElement(tagName)) {
        result.push({
          type: 'paragraph',
          content: pendingText,
        })
        pendingText = []
      }

      // Special handling for wrapper divs - recursively parse their children
      if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
        const childContent = parseElements(element.childNodes)
        result.push(...childContent)
      } else {
        const parsed = parseElement(element)
        if (parsed) {
          result.push(parsed)
        }
      }
    }
  })

  // Flush any remaining text
  if (pendingText.length > 0) {
    result.push({
      type: 'paragraph',
      content: pendingText,
    })
  }

  return result
}

function isBlockElement(tagName: string): boolean {
  return [
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'blockquote',
    'pre',
    'hr',
    'div',
    'section',
    'article',
    'table',
  ].includes(tagName)
}

function parseElement(element: Element): any | null {
  const tagName = element.tagName.toLowerCase()
  const styles = parseStyleAttribute(element.getAttribute('style') || '')

  function parseBlockAttributes(element: Element): any {
    const attrs: any = {}
    const style = element.getAttribute('style') || ''
    const styles = parseStyleAttribute(style)

    if (styles['text-align']) {
      attrs.textAlign = styles['text-align']
    }

    if (styles['line-height']) {
      attrs.lineHeight = styles['line-height']
    }

    // Priority 3: Margin and padding
    if (styles['margin']) {
      attrs.margin = styles['margin']
    }
    if (styles['margin-top']) {
      attrs.marginTop = styles['margin-top']
    }
    if (styles['margin-bottom']) {
      attrs.marginBottom = styles['margin-bottom']
    }
    if (styles['padding']) {
      attrs.padding = styles['padding']
    }
    if (styles['padding-top']) {
      attrs.paddingTop = styles['padding-top']
    }
    if (styles['padding-bottom']) {
      attrs.paddingBottom = styles['padding-bottom']
    }

    return attrs
  }

  switch (tagName) {
    case 'p':
      const attrs = parseBlockAttributes(element)
      return {
        type: 'paragraph',
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
        content: parseInlineElements(element),
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
        content: parseInlineElements(element),
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
                content: parseInlineElements(li),
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
                content: parseInlineElements(li),
              },
            ],
          })),
      }

    case 'blockquote':
      return {
        type: 'blockquote',
        content: parseInlineElements(element),
      }

    case 'table':
      const rows: any[] = []
      const tableRows = element.querySelectorAll('tr')
      tableRows.forEach((row) => {
        const cells: any[] = []
        const tableCells = row.querySelectorAll('td, th')
        tableCells.forEach((cell) => {
          const isHeader = cell.tagName.toLowerCase() === 'th'
          const cellAttrs = parseBlockAttributes(cell)
          cells.push({
            type: isHeader ? 'tableHeader' : 'tableCell',
            ...(Object.keys(cellAttrs).length > 0 ? { attrs: cellAttrs } : {}),
            content: parseInlineElements(cell),
          })
        })
        rows.push({
          type: 'tableRow',
          content: cells,
        })
      })
      return {
        type: 'table',
        content: rows,
      }

    case 'pre':
      return {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: element.textContent || '' }],
      }

    case 'code':
      return {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: element.textContent || '',
            marks: [{ type: 'code' }],
          },
        ],
      }

    case 'hr':
      return {
        type: 'horizontalRule',
      }

    case 'br':
      return {
        type: 'hardBreak',
      }

    case 'div':
    case 'section':
    case 'article':
      // Should not reach here - parseElements handles these
      return null

    case 'span':
      // Parse span content as inline
      const content = parseInlineElements(element)
      return content.length > 0
        ? {
            type: 'paragraph',
            content,
          }
        : null

    default:
      // Unknown tag - try to extract text
      const text = element.textContent?.trim()
      if (text) {
        return {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        }
      }
      return null
  }
}

function parseInlineElements(element: Element): any[] {
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
      const text = child.textContent || ''

      if (!text.trim()) return

      switch (tagName) {
        case 'strong':
        case 'b':
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'bold' }],
          })
          break

        case 'em':
        case 'i':
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'italic' }],
          })
          break

        case 'u':
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'underline' }],
          })
          break

        case 's':
        case 'del':
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'strike' }],
          })
          break

        case 'code':
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'code' }],
          })
          break

        case 'a':
          const href = child.getAttribute('href') || ''
          content.push({
            type: 'text',
            text,
            marks: [{ type: 'link', attrs: { href } }],
          })
          break

        case 'br':
          content.push({
            type: 'hardBreak',
          })
          break

        case 'span':
          const spanStyles = parseStyleAttribute(child.getAttribute('style') || '')
          const spanMarks = getMarksFromStyles(spanStyles)
          const spanText = child.textContent || ''
          if (spanText.trim()) {
            if (spanMarks.length > 0) {
              content.push({
                type: 'text',
                text: spanText,
                marks: spanMarks,
              })
            } else {
              const spanContent = parseInlineElements(child)
              content.push(...spanContent)
            }
          }
          break

        default:
          // Unknown inline tag - just extract text
          if (text.trim()) {
            content.push({
              type: 'text',
              text,
            })
          }
      }
    }
  })

  return content
}
