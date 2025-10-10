import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

/**
 * POST /api/embeddings/generate
 * Proxy to backend for generating embeddings
 * Body: { noteId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/embeddings/generate`, {
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
        { error: errorData.detail || 'Failed to generate embedding' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/embeddings/generate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/embeddings/generate-batch
 * Proxy to backend for batch embedding generation
 * Body: { noteIds: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/embeddings/generate-batch`, {
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
        { error: errorData.detail || 'Failed to generate embeddings' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/embeddings/generate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
