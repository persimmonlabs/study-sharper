import { Mark } from '@tiptap/core'

export const FontSizeMarkFixed = Mark.create({
  name: 'fontSizeFixed',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: any) => element.style.fontSize || null,
        renderHTML: (attributes: any) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="font-size"]',
        getAttrs: (element: any) => {
          const fontSize = element.style.fontSize
          return fontSize ? { fontSize } : false
        },
      },
    ]
  },

  renderHTML({ attributes }: any) {
    if (!attributes.fontSize) return ['span', 0]
    return ['span', { style: `font-size: ${attributes.fontSize}` }, 0]
  },

  addCommands() {
    return {
      setFontSizeFixed:
        (fontSize: string) =>
        ({ commands }: any) => {
          return commands.setMark(this.name, { fontSize })
        },
      unsetFontSizeFixed: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
