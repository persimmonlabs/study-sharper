import { Buffer } from 'buffer'

export interface DocxExtractionResult {
  text: string | null
  error?: string
}

export async function extractDocxText(buffer: Buffer): Promise<DocxExtractionResult> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim()
    
    return {
      text: text && text.length > 0 ? text : null,
      error: result.messages?.length > 0 ? result.messages.map((m: { message: string }) => m.message).join('; ') : undefined
    }
  } catch (error) {
    console.error('DOCX extraction failed', error)
    return {
      text: null,
      error: error instanceof Error ? error.message : 'Unknown DOCX extraction error'
    }
  }
}
