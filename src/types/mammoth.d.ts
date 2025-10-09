declare module 'mammoth' {
  interface Message {
    type: string
    message: string
  }

  interface Result {
    value: string
    messages: Message[]
  }

  interface Options {
    buffer?: Buffer
    path?: string
  }

  export function extractRawText(options: Options): Promise<Result>
  export function convertToHtml(options: Options): Promise<Result>
}
