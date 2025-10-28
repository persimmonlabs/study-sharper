import { Extension } from '@tiptap/core'
import type { RawCommands } from '@tiptap/core'

export const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const fontSize = element.style.fontSize
              return fontSize || null
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ commands }: any) => {
        return commands.setMark('textStyle', { fontSize })
      },
      unsetFontSize: () => ({ commands }: any) => {
        return commands.resetAttributes('textStyle', 'fontSize')
      },
    } as any
  },
})
