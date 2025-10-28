import { Mark } from '@tiptap/core'

export const FontSizeMark: any = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: any) => {
          const fontSize = element.style.fontSize
          return fontSize || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
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
          const fontSize = element.style.fontSize
          if (!fontSize) return false
          return { fontSize }
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ commands }: any) => {
        return commands.setMark('fontSize', { fontSize })
      },
      unsetFontSize: () => ({ commands }: any) => {
        return commands.unsetMark('fontSize')
      },
    } as any
  },
})
