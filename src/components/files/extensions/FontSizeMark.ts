import { Mark } from '@tiptap/core'

export const FontSizeMark = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => {
          const fontSize = (element as HTMLElement).style.fontSize
          return fontSize || null
        },
        renderHTML: (attributes) => {
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
        getAttrs: (element) => {
          const fontSize = (element as HTMLElement).style.fontSize
          if (!fontSize) return false
          return { fontSize }
        },
      },
    ]
  },

  renderHTML({ attributes }) {
    if (!attributes.fontSize) return ['span', 0]
    return ['span', { style: `font-size: ${attributes.fontSize}` }, 0]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ commands }: any) => {
        return commands.setMark('fontSize', { fontSize })
      },
      unsetFontSize: () => ({ commands }: any) => {
        return commands.unsetMark('fontSize')
      },
    }
  },
})
