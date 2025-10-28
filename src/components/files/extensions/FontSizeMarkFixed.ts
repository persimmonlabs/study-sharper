import { Mark } from '@tiptap/core'

export const FontSizeMarkFixed: any = Mark.create({
  name: 'fontSizeFixed',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: any) => {
          const fontSize = element.style?.fontSize
          return fontSize || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { fontSize: null },
        getAttrs: (element: any) => {
          const fontSize = element.style.fontSize
          if (!fontSize) return false
          return { fontSize }
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.fontSize) return ['span', 0]
    return ['span', { style: `font-size: ${mark.attrs.fontSize}` }, 0]
  },

  addCommands() {
    return {
      setFontSizeFixed:
        (fontSize: string) =>
        ({ commands }: any) => {
          if (!fontSize) return false
          return commands.setMark(this.name, { fontSize })
        },
      unsetFontSizeFixed: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
