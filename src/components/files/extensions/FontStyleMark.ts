import { Mark } from '@tiptap/core'

export const FontStyleMark: any = Mark.create({
  name: 'fontStyleMark',

  addAttributes() {
    return {
      fontStyle: {
        default: null,
        parseHTML: (element: any) => {
          const fontStyle = element.style?.fontStyle
          return fontStyle || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.fontStyle) return {}
          return { style: `font-style: ${attributes.fontStyle}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { fontStyle: null },
        getAttrs: (element: any) => {
          const fontStyle = element.style?.fontStyle
          if (fontStyle && fontStyle !== 'normal') {
            return { fontStyle }
          }
          return false
        },
      },
      {
        tag: 'em',
        getAttrs: () => ({ fontStyle: 'italic' }),
      },
      {
        tag: 'i',
        getAttrs: () => ({ fontStyle: 'italic' }),
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.fontStyle) return ['span', 0]
    return ['span', { style: `font-style: ${mark.attrs.fontStyle}` }, 0]
  },

  addCommands() {
    return {
      setFontStyleMark:
        (fontStyle: string) =>
        ({ commands }: any) => {
          if (!fontStyle) return false
          return commands.setMark(this.name, { fontStyle })
        },
      unsetFontStyleMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
