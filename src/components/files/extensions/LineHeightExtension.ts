import { Extension } from '@tiptap/core'

export const LineHeightExtension: any = Extension.create({
  name: 'lineHeight',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: any) => {
              const lineHeight = element.style?.lineHeight
              return lineHeight || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.lineHeight) return {}
              return {
                style: `line-height: ${attributes.lineHeight}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: any) => {
          if (!lineHeight) return false
          return commands.updateAttributes(['paragraph', 'heading'], { lineHeight })
        },
      unsetLineHeight: () => ({ commands }: any) => {
        return commands.updateAttributes(['paragraph', 'heading'], { lineHeight: null })
      },
    } as any
  },
})
