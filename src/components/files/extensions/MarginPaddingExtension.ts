import { Extension } from '@tiptap/core'

export const MarginPaddingExtension: any = Extension.create({
  name: 'marginPadding',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'codeBlock'],
        attributes: {
          margin: {
            default: null,
            parseHTML: (element: any) => {
              const margin = element.style?.margin
              return margin || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.margin) return {}
              return { style: `margin: ${attributes.margin}` }
            },
          },
          marginTop: {
            default: null,
            parseHTML: (element: any) => {
              const marginTop = element.style?.marginTop
              return marginTop || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.marginTop) return {}
              return { style: `margin-top: ${attributes.marginTop}` }
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element: any) => {
              const marginBottom = element.style?.marginBottom
              return marginBottom || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.marginBottom) return {}
              return { style: `margin-bottom: ${attributes.marginBottom}` }
            },
          },
          padding: {
            default: null,
            parseHTML: (element: any) => {
              const padding = element.style?.padding
              return padding || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.padding) return {}
              return { style: `padding: ${attributes.padding}` }
            },
          },
          paddingTop: {
            default: null,
            parseHTML: (element: any) => {
              const paddingTop = element.style?.paddingTop
              return paddingTop || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.paddingTop) return {}
              return { style: `padding-top: ${attributes.paddingTop}` }
            },
          },
          paddingBottom: {
            default: null,
            parseHTML: (element: any) => {
              const paddingBottom = element.style?.paddingBottom
              return paddingBottom || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.paddingBottom) return {}
              return { style: `padding-bottom: ${attributes.paddingBottom}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setMargin:
        (margin: string) =>
        ({ commands }: any) => {
          if (!margin) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { margin })
        },
      setMarginTop:
        (marginTop: string) =>
        ({ commands }: any) => {
          if (!marginTop) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { marginTop })
        },
      setMarginBottom:
        (marginBottom: string) =>
        ({ commands }: any) => {
          if (!marginBottom) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { marginBottom })
        },
      setPadding:
        (padding: string) =>
        ({ commands }: any) => {
          if (!padding) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { padding })
        },
      setPaddingTop:
        (paddingTop: string) =>
        ({ commands }: any) => {
          if (!paddingTop) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { paddingTop })
        },
      setPaddingBottom:
        (paddingBottom: string) =>
        ({ commands }: any) => {
          if (!paddingBottom) return false
          return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], { paddingBottom })
        },
      unsetMarginPadding: () => ({ commands }: any) => {
        return commands.updateAttributes(['paragraph', 'heading', 'blockquote', 'codeBlock'], {
          margin: null,
          marginTop: null,
          marginBottom: null,
          padding: null,
          paddingTop: null,
          paddingBottom: null,
        })
      },
    } as any
  },
})
