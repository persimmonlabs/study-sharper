import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

/**
 * POST /api/embeddings/search
 * Proxy to backend for semantic search
 * Body: { query: string, limit?: number, threshold?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/embeddings/search`, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to search notes' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/embeddings/search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/embeddings/search/related
 * Proxy to backend for finding related notes
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const noteId = url.searchParams.get('noteId')
    const limit = url.searchParams.get('limit') || '5'

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
    }

    const response = await fetch(
      `${BACKEND_URL}/api/embeddings/related/${noteId}?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to find related notes' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/embeddings/search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
