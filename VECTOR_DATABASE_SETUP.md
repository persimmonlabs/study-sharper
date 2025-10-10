# 🔍 Vector Database Setup Guide

## Overview

This guide explains how to set up and use the pgvector-based semantic search system for Study Sharper. This enables intelligent note retrieval based on meaning rather than exact keyword matches.

## 🎯 Features

- **Semantic Search**: Find notes by meaning, not just keywords
- **Automatic Context**: AI assistant automatically retrieves relevant notes
- **Smart Embeddings**: Uses OpenRouter API for high-quality embeddings
- **Auto-Sync**: Triggers keep embeddings updated when notes change
- **Scalable**: HNSW index for fast similarity search even with thousands of notes

---

## 📋 Prerequisites

1. **Supabase Project** with pgvector support (most projects have this)
2. **OpenRouter API Key** from https://openrouter.ai/keys
3. **Existing Study Sharper database** (notes table must exist)

---

## 🚀 Installation Steps

### Step 1: Run Database Migrations

Go to your Supabase project dashboard:
1. Navigate to **SQL Editor** in the left sidebar
2. Create a new query
3. Copy and paste the contents of `migrations/001_pgvector_setup.sql`
4. Click **Run**
5. Wait for completion (should take 5-10 seconds)

Then run the trigger setup:
1. Create another new query
2. Copy and paste the contents of `migrations/002_embedding_triggers.sql`
3. Click **Run**

### Step 2: Verify Installation

Run this query to verify everything is set up:

```sql
-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('note_embeddings', 'embedding_queue');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('search_similar_notes', 'find_related_notes');
```

All queries should return results. If not, review the migration logs for errors.

---

## 🔧 Configuration

### Environment Variables

Ensure your `.env.local` file has:

```env
# Required - Already should be set
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Embedding Model Configuration

By default, the system uses `openai/text-embedding-3-small` via OpenRouter.

To change the model, edit `src/lib/embeddings.ts`:

```typescript
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
```

**Important**: If you change the model, ensure the dimension matches the database (1536 dimensions). If using a different dimension model, you'll need to alter the table:

```sql
-- For 512 dimensions (e.g., some smaller models)
ALTER TABLE note_embeddings ALTER COLUMN embedding TYPE vector(512);
```

---

## 📝 Usage

### 1. Generate Embeddings for Existing Notes

For notes that existed before the vector database was set up, you need to generate embeddings:

#### Option A: Automatic (via triggers)

The database triggers will automatically queue all existing notes. To process them, create a simple script or use the API endpoint in a loop.

#### Option B: Manual (via API)

**Generate embedding for a single note:**
```typescript
// POST /api/embeddings/generate
const response = await fetch('/api/embeddings/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    noteId: 'uuid-of-note'
  })
})
```

**Generate embeddings for multiple notes:**
```typescript
// PUT /api/embeddings/generate
const response = await fetch('/api/embeddings/generate', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    noteIds: ['uuid-1', 'uuid-2', 'uuid-3']
  })
})
```

### 2. Semantic Search

**Search notes by query:**
```typescript
// POST /api/embeddings/search
const response = await fetch('/api/embeddings/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    query: 'photosynthesis process',
    limit: 5,
    threshold: 0.7  // Similarity threshold (0-1)
  })
})

const { results } = await response.json()
// results: [{ note_id, title, content, summary, similarity }]
```

**Find related notes:**
```typescript
// GET /api/embeddings/search?noteId=uuid&limit=5
const response = await fetch(
  `/api/embeddings/search?noteId=${noteId}&limit=5`,
  {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  }
)

const { results } = await response.json()
// results: [{ note_id, title, summary, similarity }]
```

### 3. AI Chat with Automatic Context

The chat API now automatically uses semantic search to find relevant notes:

```typescript
// POST /api/notes/chat
const response = await fetch('/api/notes/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Explain cellular respiration' }
    ],
    useSemanticSearch: true  // Default: true (automatically finds relevant notes)
  })
})

const { message, sources } = await response.json()
// message: AI response
// sources: [{ id, title }] - notes that were used as context
```

---

## 🔄 Automatic Embedding Generation

### How It Works

1. **Note Created/Updated** → Triggers add note to `embedding_queue`
2. **Background Process** → Processes queue and generates embeddings
3. **Embedding Stored** → Saved to `note_embeddings` table with content hash
4. **Queue Item Removed** → Completed items are cleaned up

### Queue Processing

The queue doesn't automatically process - you need a background worker. Here are options:

#### Option 1: Manual Processing (Development)

Run this query periodically to see pending notes:
```sql
SELECT * FROM embedding_queue WHERE status = 'pending';
```

Then process them via API.

#### Option 2: Supabase Edge Function (Recommended)

Create a Supabase Edge Function that runs on a schedule:

```typescript
// supabase/functions/process-embeddings/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get batch of pending notes
  const { data: batch } = await supabase.rpc('get_embedding_queue_batch', {
    batch_size: 10
  })

  if (!batch || batch.length === 0) {
    return new Response('No pending notes', { status: 200 })
  }

  // Process each note
  for (const item of batch) {
    // Mark as processing
    await supabase.rpc('mark_embedding_processing', {
      queue_ids: [item.queue_id]
    })

    try {
      // Generate embedding (call your API or implement here)
      // ... embedding generation logic ...

      // Mark as completed
      await supabase.rpc('mark_embedding_completed', {
        queue_ids: [item.queue_id]
      })
    } catch (error) {
      // Mark as failed
      await supabase.rpc('mark_embedding_failed', {
        queue_id_param: item.queue_id,
        error_msg: error.message
      })
    }
  }

  return new Response('Processed batch', { status: 200 })
})
```

Deploy it:
```bash
supabase functions deploy process-embeddings
```

Set up a cron job in Supabase to run it every minute.

#### Option 3: Next.js API Cron (Vercel)

If deploying to Vercel, use Vercel Cron:

```typescript
// src/app/api/cron/process-embeddings/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process embedding queue
  // ... implementation ...

  return new Response('OK', { status: 200 })
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-embeddings",
    "schedule": "* * * * *"
  }]
}
```

---

## 📊 Monitoring

### Check Embedding Coverage

```sql
-- See how many notes have embeddings
SELECT 
  COUNT(*) FILTER (WHERE has_embedding) as with_embedding,
  COUNT(*) FILTER (WHERE NOT has_embedding) as without_embedding,
  COUNT(*) as total
FROM notes_with_embeddings;
```

### Check Queue Status

```sql
SELECT * FROM embedding_queue_status;
```

### Find Notes Without Embeddings

```sql
SELECT id, title, created_at 
FROM notes_with_embeddings 
WHERE NOT has_embedding
ORDER BY created_at DESC
LIMIT 20;
```

### Test Semantic Search

```sql
-- This requires a query embedding - run via the API instead
SELECT * FROM search_similar_notes(
  '[0.1, 0.2, ...]'::vector(1536),  -- Your query embedding
  'user-uuid',
  0.7,
  5
);
```

---

## 🛠️ Troubleshooting

### Issue: "extension vector does not exist"

**Solution**: pgvector is not enabled. Run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Embeddings not generating automatically

**Checklist**:
1. ✅ Triggers are created (`\df queue_note_for_embedding`)
2. ✅ Queue table exists (`SELECT * FROM embedding_queue`)
3. ✅ Notes are being added to queue (`SELECT * FROM embedding_queue`)
4. ✅ Background worker is running (see "Queue Processing" above)

### Issue: Search returns no results

**Possible causes**:
1. No embeddings generated yet → Check `SELECT COUNT(*) FROM note_embeddings`
2. Threshold too high → Try lowering from 0.7 to 0.5
3. Query too short → Embeddings work best with complete questions/sentences

### Issue: "embedding dimension mismatch"

**Solution**: The embedding dimension doesn't match the database column. Check:
```sql
SELECT atttypmod FROM pg_attribute 
WHERE attrelid = 'note_embeddings'::regclass 
AND attname = 'embedding';
```

If incorrect, alter the table to match your model's dimension.

---

## 🎓 Best Practices

### 1. Batch Processing

For bulk embedding generation, use the batch endpoint:
- Process 10-50 notes at a time
- Respect OpenRouter rate limits
- Use exponential backoff on errors

### 2. Similarity Thresholds

- **0.9+**: Very similar (near-duplicate content)
- **0.7-0.9**: Highly relevant (default for chat)
- **0.5-0.7**: Somewhat relevant
- **<0.5**: Weakly related

### 3. Query Optimization

For best semantic search results:
- ✅ Use complete sentences or questions
- ✅ Be specific about the topic
- ❌ Avoid single keywords
- ❌ Don't use very short queries (<5 words)

### 4. Cost Management

Each embedding generation costs API credits:
- OpenAI ada-002: ~$0.0001 per 1K tokens
- OpenAI text-embedding-3-small: ~$0.00002 per 1K tokens

For 1000 notes averaging 500 words each:
- Estimated cost: $0.50 - $2.00
- One-time cost for existing notes
- Incremental cost for new notes

---

## 🔐 Security Notes

1. **RLS Policies**: All tables have Row Level Security enabled
2. **User Isolation**: Users can only search their own notes
3. **API Authentication**: All endpoints require valid user token
4. **No PII in Embeddings**: Embeddings are mathematical representations, not raw text

---

## 📚 Additional Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Vector Database Best Practices](https://www.pinecone.io/learn/vector-database/)

---

## 🐛 Support

If you encounter issues:

1. Check the migration logs in Supabase SQL Editor
2. Review Next.js server logs for API errors
3. Verify OpenRouter API key is valid
4. Check database connection and RLS policies

For additional help, review the implementation files:
- `src/lib/embeddings.ts` - Embedding generation
- `src/app/api/embeddings/*/route.ts` - API endpoints
- `migrations/*.sql` - Database schema
