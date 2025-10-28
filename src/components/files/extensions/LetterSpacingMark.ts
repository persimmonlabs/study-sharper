import { Mark } from '@tiptap/core'

export const LetterSpacingMark: any = Mark.create({
  name: 'letterSpacingMark',

  addAttributes() {
    return {
      letterSpacing: {
        default: null,
        parseHTML: (element: any) => {
          const letterSpacing = element.style?.letterSpacing
          return letterSpacing || null
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.letterSpacing) return {}
          return { style: `letter-spacing: ${attributes.letterSpacing}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        style: { letterSpacing: null },
        getAttrs: (element: any) => {
          const letterSpacing = element.style?.letterSpacing
          if (letterSpacing) {
            return { letterSpacing }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.letterSpacing) return ['span', 0]
    return ['span', { style: `letter-spacing: ${mark.attrs.letterSpacing}` }, 0]
  },

  addCommands() {
    return {
      setLetterSpacingMark:
        (letterSpacing: string) =>
        ({ commands }: any) => {
          if (!letterSpacing) return false
          return commands.setMark(this.name, { letterSpacing })
        },
      unsetLetterSpacingMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },
})
