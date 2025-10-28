import { Mark } from '@tiptap/core'

export const TextDecorationMark: any = Mark.create({
  name: 'textDecorationMark',

  addAttributes() {
    return {
      textDecoration: {
        default: null,
        parseHTML: (element: any) => {
          const textDecoration = element.style?.textDecoration
          return textDecoration || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.textDecoration) return {}
          return { style: `text-decoration: ${attributes.textDecoration}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { textDecoration: null },
        getAttrs: (element: any) => {
          const textDecoration = element.style?.textDecoration
          if (textDecoration && !textDecoration.includes('none')) {
            return { textDecoration }
          }
          return false
        },
      },
      {
        tag: 'u',
        getAttrs: () => ({ textDecoration: 'underline' }),
      },
      {
        tag: 'ins',
        getAttrs: () => ({ textDecoration: 'underline' }),
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.textDecoration) return ['span', 0]
    return ['span', { style: `text-decoration: ${mark.attrs.textDecoration}` }, 0]
  },

  addCommands() {
    return {
      setTextDecorationMark:
        (textDecoration: string) =>
        ({ commands }: any) => {
          if (!textDecoration) return false
          return commands.setMark(this.name, { textDecoration })
        },
      unsetTextDecorationMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
