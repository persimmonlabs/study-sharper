import { Mark } from '@tiptap/core'

export const StrikethroughMark: any = Mark.create({
  name: 'strikethroughMark',

  addAttributes() {
    return {
      strikethrough: {
        default: true,
        parseHTML: (element: any) => {
          const textDecoration = element.style?.textDecoration
          return textDecoration?.includes('line-through') || false
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.strikethrough) return {}
          return { style: 'text-decoration: line-through' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { textDecoration: 'line-through' },
        getAttrs: (element: any) => {
          const textDecoration = element.style?.textDecoration
          if (textDecoration?.includes('line-through')) {
            return { strikethrough: true }
          }
          return false
        },
      },
      {
        tag: 's',
      },
      {
        tag: 'del',
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.strikethrough) return ['span', 0]
    return ['span', { style: 'text-decoration: line-through' }, 0]
  },

  addCommands() {
    return {
      setStrikethroughMark: () => ({ commands }: any) => {
        return commands.setMark(this.name)
      },
      unsetStrikethroughMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
      toggleStrikethroughMark: () => ({ commands }: any) => {
        return commands.toggleMark(this.name)
      },
    } as any
  },
})
