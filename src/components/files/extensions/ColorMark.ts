import { Mark } from '@tiptap/core'

export const ColorMark: any = Mark.create({
  name: 'colorMark',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: any) => {
          const color = element.style?.color
          return color || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.color) return {}
          return { style: `color: ${attributes.color}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { color: null },
        getAttrs: (element: any) => {
          const color = element.style.color
          if (!color) return false
          return { color }
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.color) return ['span', 0]
    return ['span', { style: `color: ${mark.attrs.color}` }, 0]
  },

  addCommands() {
    return {
      setColorMark:
        (color: string) =>
        ({ commands }: any) => {
          if (!color) return false
          return commands.setMark(this.name, { color })
        },
      unsetColorMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
