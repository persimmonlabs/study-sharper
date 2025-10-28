import { Mark } from '@tiptap/core'

export const Color: any = Mark.create({
  name: 'color',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: any) => {
          return element.style.color || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes.color) {
            return {}
          }
          return {
            style: `color: ${attributes.color}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element: any) => {
          const color = element.style.color
          if (!color) return false
          return { color }
        },
      },
    ]
  },

  renderHTML({ mark, attrs }: any) {
    if (!attrs.color) return ['span', 0]
    return ['span', { style: `color: ${attrs.color}` }, 0]
  },

  addCommands() {
    return {
      setColor: (color: string) => ({ commands }: any) => {
        return commands.setMark('color', { color })
      },
      unsetColor: () => ({ commands }: any) => {
        return commands.unsetMark('color')
      },
    } as any
  },
})
