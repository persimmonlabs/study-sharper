import { Mark } from '@tiptap/core'

export const ColorMark = Mark.create({
  name: 'colorMark',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: any) => element.style.color || null,
        renderHTML: (attributes: any) => {
          if (!attributes.color) return {}
          return { style: `color: ${attributes.color}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="color"]',
        getAttrs: (element: any) => {
          const color = element.style.color
          return color ? { color } : false
        },
      },
    ]
  },

  renderHTML({ attributes }: any) {
    if (!attributes.color) return ['span', 0]
    return ['span', { style: `color: ${attributes.color}` }, 0]
  },

  addCommands() {
    return {
      setColorMark:
        (color: string) =>
        ({ commands }: any) => {
          return commands.setMark(this.name, { color })
        },
      unsetColorMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
