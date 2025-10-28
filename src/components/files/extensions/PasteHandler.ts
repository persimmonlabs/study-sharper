import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export const PasteHandler: any = Extension.create({
  name: 'pasteHandler',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        props: {
          handlePaste: (view: any, event: ClipboardEvent) => {
            const html = event.clipboardData?.getData('text/html')
            const text = event.clipboardData?.getData('text/plain')

            if (!html && !text) return false

            // If we have HTML, preserve it with formatting
            if (html) {
              try {
                const container = document.createElement('div')
                container.innerHTML = html
                const processedHtml = container.innerHTML

                // Insert the HTML content
                const tr = view.state.tr
                const { $from } = view.state.selection

                // Parse and insert the HTML
                const slice = view.editor.schema.parseFromString(processedHtml, 'text/html')
                tr.insert($from.pos, slice.content)

                view.dispatch(tr)
                return true
              } catch (e) {
                // Fallback to plain text on error
                return false
              }
            }

            // Fallback to plain text
            if (text) {
              const tr = view.state.tr
              const { $from } = view.state.selection
              tr.insertText(text, $from.pos)
              view.dispatch(tr)
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})
