import { Mark } from '@tiptap/core'

export const FontFamilyMarkFixed = Mark.create({
  name: 'fontFamilyFixed',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: any) => element.style.fontFamily || null,
        renderHTML: (attributes: any) => {
          if (!attributes.fontFamily) return {}
          return { style: `font-family: ${attributes.fontFamily}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="font-family"]',
        getAttrs: (element: any) => {
          const fontFamily = element.style.fontFamily
          return fontFamily ? { fontFamily } : false
        },
      },
    ]
  },

  renderHTML({ attributes }: any) {
    if (!attributes.fontFamily) return ['span', 0]
    return ['span', { style: `font-family: ${attributes.fontFamily}` }, 0]
  },

  addCommands() {
    return {
      setFontFamilyFixed:
        (fontFamily: string) =>
        ({ commands }: any) => {
          return commands.setMark(this.name, { fontFamily })
        },
      unsetFontFamilyFixed: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
