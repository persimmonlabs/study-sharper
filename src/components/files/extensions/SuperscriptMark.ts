import { Mark } from '@tiptap/core'

export const SuperscriptMark: any = Mark.create({
  name: 'superscriptMark',

  addAttributes() {
    return {
      superscript: {
        default: true,
        parseHTML: (element: any) => {
          const verticalAlign = element.style?.verticalAlign
          return verticalAlign === 'super' || false
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.superscript) return {}
          return { style: 'vertical-align: super; font-size: 0.8em' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'sup',
      },
      {
        tag: 'span',
        style: { verticalAlign: 'super' },
        getAttrs: (element: any) => {
          const verticalAlign = element.style?.verticalAlign
          if (verticalAlign === 'super') {
            return { superscript: true }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.superscript) return ['span', 0]
    return ['span', { style: 'vertical-align: super; font-size: 0.8em' }, 0]
  },

  addCommands() {
    return {
      setSuperscriptMark: () => ({ commands }: any) => {
        return commands.setMark(this.name)
      },
      unsetSuperscriptMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
      toggleSuperscriptMark: () => ({ commands }: any) => {
        return commands.toggleMark(this.name)
      },
    } as any
  },
})
