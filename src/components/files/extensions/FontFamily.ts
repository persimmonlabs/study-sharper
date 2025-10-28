import { Mark } from '@tiptap/core'

export const FontFamily = Mark.create({
  name: 'fontFamily',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element) => {
          const fontFamily = (element as HTMLElement).style.fontFamily
          return fontFamily || null
        },
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) {
            return {}
          }
          return {
            style: `font-family: ${attributes.fontFamily}`,
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
          const fontFamily = (element as HTMLElement).style.fontFamily
          if (!fontFamily) return false
          return { fontFamily }
        },
      },
    ]
  },

  renderHTML({ attributes }) {
    if (!attributes.fontFamily) return ['span', 0]
    return ['span', { style: `font-family: ${attributes.fontFamily}` }, 0]
  },

  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ commands }: any) => {
        return commands.setMark('fontFamily', { fontFamily })
      },
      unsetFontFamily: () => ({ commands }: any) => {
        return commands.unsetMark('fontFamily')
      },
    }
  },
})
