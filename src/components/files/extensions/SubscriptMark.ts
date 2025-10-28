import { Mark } from '@tiptap/core'

export const SubscriptMark: any = Mark.create({
  name: 'subscriptMark',

  addAttributes() {
    return {
      subscript: {
        default: true,
        parseHTML: (element: any) => {
          const verticalAlign = element.style?.verticalAlign
          return verticalAlign === 'sub' || false
        },
        renderHTML: (attributes: any) => {
          if (!attributes?.subscript) return {}
          return { style: 'vertical-align: sub; font-size: 0.8em' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'sub',
      },
      {
        tag: 'span',
        style: { verticalAlign: 'sub' },
        getAttrs: (element: any) => {
          const verticalAlign = element.style?.verticalAlign
          if (verticalAlign === 'sub') {
            return { subscript: true }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ mark }: any) {
    if (!mark?.attrs?.subscript) return ['span', 0]
    return ['span', { style: 'vertical-align: sub; font-size: 0.8em' }, 0]
  },

  addCommands() {
    return {
      setSubscriptMark: () => ({ commands }: any) => {
        return commands.setMark(this.name)
      },
      unsetSubscriptMark: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
      toggleSubscriptMark: () => ({ commands }: any) => {
        return commands.toggleMark(this.name)
      },
    } as any
  },
})
