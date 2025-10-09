import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  messages: ChatMessage[]
  noteIds?: string[]
  model?: string
}

interface NoteForContext {
  id: string
  title: string
  summary: string | null
  content: string | null
  extracted_text: string | null
}

interface ChatResponsePayload {
  message: string
  sources: Array<{ id: string; title: string }>
}

function buildNoteContext(notes: NoteForContext[]): {
  context: string
  sources: Array<{ id: string; title: string }>
} {
  if (!notes.length) {
    return { context: '', sources: [] }
  }

  const snippets = notes.slice(0, 4).map((note, index) => {
    const body = note.extracted_text || note.content || ''
    const trimmed = body.length > 2000 ? `${body.slice(0, 2000)}…` : body

    const lines = [`Note ${index + 1}: ${note.title}`]
    if (note.summary) {
      lines.push(`Summary: ${note.summary}`)
    }
    if (trimmed) {
      lines.push(`Content:\n${trimmed}`)
    }
    return lines.join('\n')
  })

  const sources = notes.map(note => ({ id: note.id, title: note.title }))
  return { context: snippets.join('\n\n'), sources }
}

async function getAuthedClient(request: Request): Promise<{
  supabase: SupabaseClient<Database>
  userId: string
}> {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null

  if (bearerToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    const { data, error } = await supabase.auth.getUser(bearerToken)
    if (error || !data?.user) {
      throw new Error('Unauthorized')
    }

    return { supabase, userId: data.user.id }
  }

  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    throw new Error('Unauthorized')
  }

  return { supabase, userId: data.user.id }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = (await request.json().catch(() => null)) as ChatRequestBody | null

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    const { supabase, userId } = await getAuthedClient(request)

    let context = ''
    let sources: ChatResponsePayload['sources'] = []

    if (body.noteIds && body.noteIds.length > 0) {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('id,title,summary,content,extracted_text')
        .in('id', body.noteIds)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to fetch notes for context:', error)
        return NextResponse.json(
          { error: 'Failed to load notes for context' },
          { status: 500 }
        )
      }

      if (notes && notes.length > 0) {
        const built = buildNoteContext(notes as NoteForContext[])
        context = built.context
        sources = built.sources
      }
    }

    const systemPromptParts = [
      'You are Study Sharper’s AI assistant.',
      'Use the provided notes context when answering. If the notes do not contain the answer, respond honestly and suggest helpful next steps.',
      'Return well-structured, clear explanations tailored to students.',
      context ? `Notes context:\n${context}` : null
    ].filter(Boolean)

    const payload = {
      model: body.model ?? DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPromptParts.join('\n\n')
        },
        ...body.messages
      ],
      max_tokens: 800,
      temperature: 0.2
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        'X-Title': 'Study Sharper'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      console.error('OpenRouter error:', response.status, errorPayload)
      return NextResponse.json(
        { error: errorPayload?.error?.message ?? 'OpenRouter request failed' },
        { status: response.status }
      )
    }

    const completion = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>
    } | null

    const message = completion?.choices?.[0]?.message?.content ?? 'No response generated.'

    const payloadResponse: ChatResponsePayload = {
      message,
      sources
    }

    return NextResponse.json(payloadResponse)
  } catch (error) {
    console.error('Chat route error:', error)
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Failed to generate AI response' },
      { status }
    )
  }
}
