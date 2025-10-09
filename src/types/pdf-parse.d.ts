declare module 'pdf-parse' {
  interface PdfInfo {
    Pages?: number
  }

  interface PdfParseResult {
    numpages: number
    numrender: number
    info: PdfInfo
    metadata: any
    version: string
    text: string
  }

  type PdfParse = (dataBuffer: Buffer, options?: { max?: number }) => Promise<PdfParseResult>

  const pdfParse: PdfParse
  export default pdfParse
}
