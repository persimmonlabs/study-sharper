import { Extension } from '@tiptap/core'

export const TableStyleExtension: any = Extension.create({
  name: 'tableStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['table', 'tableRow', 'tableCell', 'tableHeader'],
        attributes: {
          borderColor: {
            default: null,
            parseHTML: (element: any) => {
              const borderColor = element.style?.borderColor
              return borderColor || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.borderColor) return {}
              return { style: `border-color: ${attributes.borderColor}` }
            },
          },
          backgroundColor: {
            default: null,
            parseHTML: (element: any) => {
              const backgroundColor = element.style?.backgroundColor
              return backgroundColor || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.backgroundColor) return {}
              return { style: `background-color: ${attributes.backgroundColor}` }
            },
          },
          borderWidth: {
            default: null,
            parseHTML: (element: any) => {
              const borderWidth = element.style?.borderWidth
              return borderWidth || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.borderWidth) return {}
              return { style: `border-width: ${attributes.borderWidth}` }
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
          textAlign: {
            default: null,
            parseHTML: (element: any) => {
              const textAlign = element.style?.textAlign || element.align
              return textAlign || null
            },
            renderHTML: (attributes: any) => {
              if (!attributes?.textAlign) return {}
              return { style: `text-align: ${attributes.textAlign}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTableBorderColor:
        (borderColor: string) =>
        ({ commands }: any) => {
          if (!borderColor) return false
          return commands.updateAttributes(['table', 'tableRow', 'tableCell', 'tableHeader'], { borderColor })
        },
      setTableBackgroundColor:
        (backgroundColor: string) =>
        ({ commands }: any) => {
          if (!backgroundColor) return false
          return commands.updateAttributes(['table', 'tableRow', 'tableCell', 'tableHeader'], { backgroundColor })
        },
      setTableBorderWidth:
        (borderWidth: string) =>
        ({ commands }: any) => {
          if (!borderWidth) return false
          return commands.updateAttributes(['table', 'tableRow', 'tableCell', 'tableHeader'], { borderWidth })
        },
      setTablePadding:
        (padding: string) =>
        ({ commands }: any) => {
          if (!padding) return false
          return commands.updateAttributes(['table', 'tableRow', 'tableCell', 'tableHeader'], { padding })
        },
    } as any
  },
})
