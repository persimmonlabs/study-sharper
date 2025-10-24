import { JSONContent } from '@tiptap/core'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

/**
 * Convert markdown string to Tiptap JSON format
 * This parses markdown and builds a ProseMirror-compatible JSON structure
 */
export function markdownToJSON(markdown: string): JSONContent {
  if (!markdown || !markdown.trim()) {
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

  const tokens = md.parse(markdown, {})
  const content: JSONContent[] = []

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'heading_open') {
      const level = parseInt(token.tag[1])
      const contentToken = tokens[i + 1]
      const text = contentToken?.content || ''
      i += 3

      content.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text }],
      })
      continue
    }

    if (token.type === 'paragraph_open') {
      const contentToken = tokens[i + 1]
      const closeToken = tokens[i + 2]

      if (contentToken?.type === 'inline') {
        const paraContent = parseInlineTokens(contentToken.children || [])
        content.push({
          type: 'paragraph',
          content: paraContent.length > 0 ? paraContent : [{ type: 'text', text: '' }],
        })
      }

      i += 3
      continue
    }

    if (token.type === 'bullet_list_open') {
      const listContent: JSONContent[] = []
      i++

      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          i++
          const itemContent: JSONContent[] = []

          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'paragraph_open') {
              const contentToken = tokens[i + 1]
              if (contentToken?.type === 'inline') {
                itemContent.push({
                  type: 'paragraph',
                  content: parseInlineTokens(contentToken.children || []),
                })
              }
              i += 3
            } else {
              i++
            }
          }

          listContent.push({
            type: 'listItem',
            content: itemContent.length > 0 ? itemContent : [{ type: 'paragraph', content: [] }],
          })
          i++
        } else {
          i++
        }
      }

      content.push({
        type: 'bulletList',
        content: listContent,
      })
      i++
      continue
    }

    if (token.type === 'ordered_list_open') {
      const listContent: JSONContent[] = []
      i++

      while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'list_item_open') {
          i++
          const itemContent: JSONContent[] = []

          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'paragraph_open') {
              const contentToken = tokens[i + 1]
              if (contentToken?.type === 'inline') {
                itemContent.push({
                  type: 'paragraph',
                  content: parseInlineTokens(contentToken.children || []),
                })
              }
              i += 3
            } else {
              i++
            }
          }

          listContent.push({
            type: 'listItem',
            content: itemContent.length > 0 ? itemContent : [{ type: 'paragraph', content: [] }],
          })
          i++
        } else {
          i++
        }
      }

      content.push({
        type: 'orderedList',
        content: listContent,
      })
      i++
      continue
    }

    if (token.type === 'code_block') {
      const codeContent = token.content
      content.push({
        type: 'codeBlock',
        attrs: { language: token.info || 'text' },
        content: [{ type: 'text', text: codeContent }],
      })
      i++
      continue
    }

    if (token.type === 'blockquote_open') {
      const quoteContent: JSONContent[] = []
      i++

      while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
        if (tokens[i].type === 'paragraph_open') {
          const contentToken = tokens[i + 1]
          if (contentToken?.type === 'inline') {
            quoteContent.push({
              type: 'paragraph',
              content: parseInlineTokens(contentToken.children || []),
            })
          }
          i += 3
        } else {
          i++
        }
      }

      content.push({
        type: 'blockquote',
        content: quoteContent.length > 0 ? quoteContent : [{ type: 'paragraph', content: [] }],
      })
      i++
      continue
    }

    if (token.type === 'hr') {
      content.push({
        type: 'horizontalRule',
      })
      i++
      continue
    }

    i++
  }

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
}

/**
 * Parse inline tokens (bold, italic, links, etc.)
 */
function parseInlineTokens(tokens: any[]): JSONContent[] {
  const content: JSONContent[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'text') {
      content.push({
        type: 'text',
        text: token.content,
      })
      i++
      continue
    }

    if (token.type === 'strong_open') {
      const textToken = tokens[i + 1]
      const text = textToken?.content || ''
      content.push({
        type: 'text',
        text,
        marks: [{ type: 'bold' }],
      })
      i += 3
      continue
    }

    if (token.type === 'em_open') {
      const textToken = tokens[i + 1]
      const text = textToken?.content || ''
      content.push({
        type: 'text',
        text,
        marks: [{ type: 'italic' }],
      })
      i += 3
      continue
    }

    if (token.type === 'code_inline') {
      content.push({
        type: 'text',
        text: token.content,
        marks: [{ type: 'code' }],
      })
      i++
      continue
    }

    if (token.type === 'link_open') {
      const href = token.attrGet('href') || ''
      const textToken = tokens[i + 1]
      const text = textToken?.content || ''
      content.push({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href } }],
      })
      i += 3
      continue
    }

    if (token.type === 'softbreak') {
      content.push({
        type: 'text',
        text: '\n',
      })
      i++
      continue
    }

    if (token.type === 'hardbreak') {
      content.push({
        type: 'text',
        text: '\n',
      })
      i++
      continue
    }

    i++
  }

  return content.length > 0 ? content : [{ type: 'text', text: '' }]
}

/**
 * Convert Tiptap JSON to markdown string
 * This serializes the ProseMirror JSON structure back to markdown
 */
export function jsonToMarkdown(json: JSONContent): string {
  if (!json || !json.content) {
    return ''
  }

  return json.content.map((node) => nodeToMarkdown(node)).join('\n')
}

function nodeToMarkdown(node: JSONContent, depth: number = 0): string {
  if (!node.type) return ''

  switch (node.type) {
    case 'doc':
      return node.content?.map((n) => nodeToMarkdown(n, depth)).join('\n') || ''

    case 'paragraph':
      return contentToMarkdown(node.content || [])

    case 'heading':
      const level = node.attrs?.level || 1
      const headingContent = contentToMarkdown(node.content || [])
      return `${'#'.repeat(level)} ${headingContent}`

    case 'bulletList':
      return node.content?.map((item) => listItemToMarkdown(item, '- ', depth)).join('\n') || ''

    case 'orderedList':
      return node.content?.map((item, idx) => listItemToMarkdown(item, `${idx + 1}. `, depth)).join('\n') || ''

    case 'listItem':
      return contentToMarkdown(node.content || [])

    case 'codeBlock':
      const language = node.attrs?.language || ''
      const codeContent = contentToMarkdown(node.content || [])
      return `\`\`\`${language}\n${codeContent}\n\`\`\``

    case 'blockquote':
      const quoteContent = node.content?.map((n) => nodeToMarkdown(n, depth + 1)).join('\n') || ''
      return quoteContent
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')

    case 'horizontalRule':
      return '---'

    default:
      return node.content?.map((n) => nodeToMarkdown(n, depth)).join('') || ''
  }
}

function listItemToMarkdown(item: JSONContent, prefix: string, depth: number): string {
  const indent = '  '.repeat(depth)
  const content = item.content?.map((n) => nodeToMarkdown(n, depth)).join('\n') || ''
  return `${indent}${prefix}${content}`
}

function contentToMarkdown(content: JSONContent[]): string {
  return content
    .map((node) => {
      if (node.type === 'text') {
        let text = node.text || ''

        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`
                break
              case 'italic':
                text = `*${text}*`
                break
              case 'code':
                text = `\`${text}\``
                break
              case 'link':
                const href = mark.attrs?.href || ''
                text = `[${text}](${href})`
                break
              case 'strike':
                text = `~~${text}~~`
                break
            }
          }
        }

        return text
      }

      return nodeToMarkdown(node)
    })
    .join('')
}
