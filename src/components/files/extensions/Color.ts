import { Mark } from '@tiptap/core'

export const Color = Mark.create({
  name: 'color',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          return element.style.color || null
        },
        renderHTML: (attributes) => {
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
        getAttrs: (element) => {
          const color = (element as HTMLElement).style.color
          if (!color) return false
          return { color }
        },
      },
    ]
  },

  renderHTML({ attributes }) {
    if (!attributes.color) return ['span', 0]
    return ['span', { style: `color: ${attributes.color}` }, 0]
  },

  addCommands() {
    return {
      setColor: (color: string) => ({ commands }: any) => {
        return commands.setMark('color', { color })
      },
      unsetColor: () => ({ commands }: any) => {
        return commands.unsetMark('color')
      },
    }
  },
})
