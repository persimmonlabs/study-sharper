import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://study-sharper-backend-production.up.railway.app'

export async function GET(
  request: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { setId } = params

    // Forward request to backend with user's access token
    const response = await fetch(`${BACKEND_URL}/api/flashcards/${setId}/cards`, {
      method: 'GET',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch flashcards' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching flashcards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
