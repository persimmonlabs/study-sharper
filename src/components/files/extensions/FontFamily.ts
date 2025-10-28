import { Mark } from '@tiptap/core'

export const FontFamily: any = Mark.create({
  name: 'fontFamily',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: any) => {
          const fontFamily = element.style.fontFamily
          return fontFamily || null
        },
        renderHTML: (attributes: any) => {
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
        getAttrs: (element: any) => {
          const fontFamily = element.style.fontFamily
          if (!fontFamily) return false
          return { fontFamily }
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ commands }: any) => {
        return commands.setMark('fontFamily', { fontFamily })
      },
      unsetFontFamily: () => ({ commands }: any) => {
        return commands.unsetMark('fontFamily')
      },
    } as any
  },
})
