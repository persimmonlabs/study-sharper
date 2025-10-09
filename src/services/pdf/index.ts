export interface ExtractedPdfContent {
  text: string
  metadata?: Record<string, unknown>
}

export async function extractPdfText(_filePath: string): Promise<ExtractedPdfContent | null> {
  // TODO: Integrate with a PDF parsing pipeline (e.g., Supabase Edge Function or serverless worker).
  return null
}

export async function summarizePdfText(_text: string): Promise<string | null> {
  // TODO: Connect to AI summarization service when ready.
  return null
}
