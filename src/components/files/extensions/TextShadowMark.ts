import { Mark } from '@tiptap/core'

export const TextShadowMark: any = Mark.create({
  name: 'textShadowMark',

  addAttributes() {
    return {
      textShadow: {
        default: null,
        parseHTML: (element: any) => {
          const textShadow = element.style?.textShadow
          return textShadow || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.textShadow) return {}
          return { style: `text-shadow: ${attributes.textShadow}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { textShadow: null },
        getAttrs: (element: any) => {
          const textShadow = element.style?.textShadow
          if (textShadow && textShadow !== 'none') {
            return { textShadow }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.textShadow) return ['span', 0]
    return ['span', { style: `text-shadow: ${mark.attrs.textShadow}` }, 0]
  },

  addCommands() {
    return {
      setTextShadowMark:
        (textShadow: string) =>
        ({ commands }: any) => {
          if (!textShadow) return false
          return commands.setMark(this.name, { textShadow })
        },
      unsetTextShadowMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
