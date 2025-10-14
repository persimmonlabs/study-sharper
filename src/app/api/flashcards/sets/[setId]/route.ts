import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

async function forwardRequest(
  request: NextRequest,
  method: 'GET' | 'DELETE',
  setId: string
) {
  const authHeader = request.headers.get('authorization')

  const response = await fetch(`${BACKEND_URL}/api/flashcards/sets/${setId}`, {
    method,
    headers: {
      ...(authHeader && { 'Authorization': authHeader }),
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    return NextResponse.json(
      { error: error.detail || `Failed to ${method === 'GET' ? 'fetch' : 'delete'} flashcard set` },
      { status: response.status }
    )
  }

  if (method === 'DELETE') {
    return NextResponse.json({ success: true })
  }

  const data = await response.json()
  return NextResponse.json(data)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    return await forwardRequest(request, 'GET', params.setId)
  } catch (error) {
    console.error('Error fetching flashcard set:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    return await forwardRequest(request, 'DELETE', params.setId)
  } catch (error) {
    console.error('Error deleting flashcard set:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
