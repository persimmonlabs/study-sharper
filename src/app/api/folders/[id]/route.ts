import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id } = params
    
    const response = await fetch(`${BACKEND_URL}/api/folders/${id}`, {
      method: 'GET',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch folder' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/folders/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to communicate with backend' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id } = params
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/folders/${id}`, {
      method: 'PUT',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to update folder' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/folders/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to communicate with backend' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id } = params
    
    const response = await fetch(`${BACKEND_URL}/api/folders/${id}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to delete folder' },
        { status: response.status }
      )
    }
    
    // Return empty response with 204 No Content (standard for successful DELETE)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/folders/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to communicate with backend' },
      { status: 500 }
    )
  }
}
