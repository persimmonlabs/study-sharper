import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'buffer'

interface ExtractPdfOptions {
  /** Path of the PDF within Supabase storage */
  storagePath?: string
  /** Raw buffer of the PDF */
  buffer?: Buffer
  /** Maximum number of pages to extract (defaults to all) */
  maxPages?: number
  /** Optional original file name for logging/OCR submissions */
  fileName?: string
}

export interface PdfExtractionResult {
  text: string | null
  pageCount?: number
  usedOcr: boolean
  ocrAttempted: boolean
  ocrError?: string
  nativeError?: string
}

async function getBufferFromStorage(storagePath: string): Promise<Buffer | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.storage.from('notes-pdfs').download(storagePath)

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to download PDF file for extraction')
  }

  return Buffer.from(await data.arrayBuffer())
}

async function runOcrFallback(buffer: Buffer, fileName?: string): Promise<{ text: string | null; error?: string }> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    console.warn('OCR fallback skipped: OCR_SPACE_API_KEY environment variable is not set')
    return { text: null, error: 'OCR API key not configured' }
  }

  const endpoint = process.env.OCR_SPACE_API_URL ?? 'https://api.ocr.space/parse/image'
  try {
    const formData = new FormData()
    formData.append('apikey', apiKey)
    formData.append('language', process.env.OCR_SPACE_LANGUAGE ?? 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('filetype', 'PDF')
    formData.append('scale', 'true')
    formData.append('OCREngine', process.env.OCR_SPACE_ENGINE ?? '2')

    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    formData.append('file', blob, fileName ?? 'upload.pdf')

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const message = `OCR request failed with status ${response.status}`
      console.error(message)
      return { text: null, error: message }
    }

    const payload = await response.json() as {
      IsErroredOnProcessing?: boolean
      ErrorMessage?: string | string[]
      ParsedResults?: Array<{ ParsedText?: string }>
    }

    if (payload.IsErroredOnProcessing) {
      const errorMessage = Array.isArray(payload.ErrorMessage)
        ? payload.ErrorMessage.join(', ')
        : payload.ErrorMessage || 'OCR provider returned an error'
      console.error('OCR provider error:', errorMessage)
      return { text: null, error: errorMessage }
    }

    const parsedText = payload.ParsedResults?.[0]?.ParsedText ?? ''
    const cleanText = parsedText.trim()
    return { text: cleanText.length > 0 ? cleanText : null }
  } catch (error) {
    console.error('Unexpected OCR fallback error', error)
    return { text: null, error: error instanceof Error ? error.message : 'Unknown OCR error' }
  }
}

async function extractWithPdfJs(_buffer: Buffer, _maxPages?: number): Promise<{ text: string | null; pageCount?: number; error?: string }> {
  return {
    text: null,
    pageCount: undefined,
    error: 'Native PDF extraction disabled (dependency removed)'
  }
}

export async function extractPdfText(options: ExtractPdfOptions): Promise<PdfExtractionResult | null> {
  try {
    let buffer: Buffer | null = options.buffer ?? null

    if (!buffer && options.storagePath) {
      buffer = await getBufferFromStorage(options.storagePath)
    }

    if (!buffer) {
      return null
    }

    // Attempt 1: Native PDF parsing via pdfjs-dist
    console.log('PDF extraction skipped: pdfjs-dist disabled in lightweight build')
    const nativeResult = await extractWithPdfJs(buffer, options.maxPages)
    if (nativeResult.text) {
      return {
        text: nativeResult.text,
        pageCount: nativeResult.pageCount,
        usedOcr: false,
        ocrAttempted: false,
      }
    }

    let ocrAttempted = false
    let ocrError: string | undefined

    // Attempt 2: OCR fallback (OCR.space)
    console.warn('Native extraction returned no text; attempting OCR fallback')
    ocrAttempted = true
    const ocrResult = await runOcrFallback(buffer, options.fileName)
    if (ocrResult.text) {
      return {
        text: ocrResult.text,
        pageCount: nativeResult.pageCount,
        usedOcr: true,
        ocrAttempted,
        ocrError: ocrResult.error,
      }
    }

    ocrError = ocrResult.error

    // All attempts exhausted
    return {
      text: null,
      pageCount: nativeResult.pageCount,
      usedOcr: false,
      ocrAttempted,
      ocrError,
      nativeError: nativeResult.error,
    }
  } catch (error) {
    console.error('Failed to extract PDF text', error)
    return null
  }
}
