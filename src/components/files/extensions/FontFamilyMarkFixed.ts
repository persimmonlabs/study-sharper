import { Mark } from '@tiptap/core'

export const FontFamilyMarkFixed: any = Mark.create({
  name: 'fontFamilyFixed',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: any) => {
          const fontFamily = element.style?.fontFamily
          return fontFamily || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.fontFamily) return {}
          return { style: `font-family: ${attributes.fontFamily}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { fontFamily: null },
        getAttrs: (element: any) => {
          const fontFamily = element.style.fontFamily
          if (!fontFamily) return false
          return { fontFamily }
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.fontFamily) return ['span', 0]
    return ['span', { style: `font-family: ${mark.attrs.fontFamily}` }, 0]
  },

  addCommands() {
    return {
      setFontFamilyFixed:
        (fontFamily: string) =>
        ({ commands }: any) => {
          if (!fontFamily) return false
          return commands.setMark(this.name, { fontFamily })
        },
      unsetFontFamilyFixed: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
