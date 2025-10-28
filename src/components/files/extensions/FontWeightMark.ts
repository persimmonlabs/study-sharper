import { Mark } from '@tiptap/core'

export const FontWeightMark: any = Mark.create({
  name: 'fontWeightMark',

  addAttributes() {
    return {
      fontWeight: {
        default: null,
        parseHTML: (element: any) => {
          const fontWeight = element.style?.fontWeight
          return fontWeight || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.fontWeight) return {}
          return { style: `font-weight: ${attributes.fontWeight}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { fontWeight: null },
        getAttrs: (element: any) => {
          const fontWeight = element.style?.fontWeight
          if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
            return { fontWeight }
          }
          return false
        },
      },
      {
        tag: 'strong',
        getAttrs: () => ({ fontWeight: 'bold' }),
      },
      {
        tag: 'b',
        getAttrs: () => ({ fontWeight: 'bold' }),
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.fontWeight) return ['span', 0]
    return ['span', { style: `font-weight: ${mark.attrs.fontWeight}` }, 0]
  },

  addCommands() {
    return {
      setFontWeightMark:
        (fontWeight: string) =>
        ({ commands }: any) => {
          if (!fontWeight) return false
          return commands.setMark(this.name, { fontWeight })
        },
      unsetFontWeightMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
