# 🚀 Vector Database Quick Start

## 5-Minute Setup

### 1. Run Migrations in Supabase

Open Supabase SQL Editor and run these files in order:

1. **`migrations/001_pgvector_setup.sql`** - Sets up vector database
2. **`migrations/002_embedding_triggers.sql`** - Sets up automatic queue

### 2. Verify Setup

Run in Supabase SQL Editor:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT * FROM note_embeddings LIMIT 1;
SELECT * FROM embedding_queue LIMIT 1;
```

### 3. Test the System

#### Generate Embedding for a Note

```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"noteId": "your-note-uuid"}'
```

#### Search for Notes

```bash
curl -X POST http://localhost:3000/api/embeddings/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "explain photosynthesis", "limit": 5}'
```

#### Use AI Chat with Auto-Context

```bash
curl -X POST http://localhost:3000/api/notes/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain photosynthesis"}
    ],
    "useSemanticSearch": true
  }'
```

---

## What Changed?

### New Database Tables
- `note_embeddings` - Stores vector embeddings (1536 dimensions)
- `embedding_queue` - Tracks notes that need embedding generation

### New API Endpoints
- `POST /api/embeddings/generate` - Generate embedding for one note
- `PUT /api/embeddings/generate` - Generate embeddings for multiple notes
- `POST /api/embeddings/search` - Semantic search across notes
- `GET /api/embeddings/search?noteId=X` - Find related notes

### Enhanced Endpoints
- `POST /api/notes/chat` - Now supports `useSemanticSearch: true` for automatic context

### New Functions
- `search_similar_notes()` - Find notes by semantic similarity
- `find_related_notes()` - Get notes related to a specific note
- `get_embedding_queue_batch()` - Process embedding queue
- Various queue management functions

---

## How to Use in Your App

### Semantic Search

```typescript
const searchNotes = async (query: string) => {
  const response = await fetch('/api/embeddings/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, limit: 5, threshold: 0.7 })
  })
  
  const { results } = await response.json()
  return results // [{ note_id, title, content, summary, similarity }]
}
```

### AI Chat with Auto-Context

```typescript
const chatWithAI = async (message: string) => {
  const response = await fetch('/api/notes/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      useSemanticSearch: true  // Automatically finds relevant notes!
    })
  })
  
  const { message: reply, sources } = await response.json()
  console.log('AI Reply:', reply)
  console.log('Used notes:', sources) // [{ id, title }]
  return reply
}
```

### Generate Embeddings on Note Save

```typescript
const saveNote = async (note: Note) => {
  // Save note first
  const { data } = await supabase
    .from('notes')
    .upsert(note)
    .select()
    .single()
  
  // Generate embedding (async, don't await)
  fetch('/api/embeddings/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ noteId: data.id })
  }).catch(console.error) // Fire and forget
  
  return data
}
```

---

## Key Features

✅ **Automatic Context Retrieval** - AI chat finds relevant notes automatically
✅ **Semantic Search** - Search by meaning, not just keywords  
✅ **Auto-Queue** - Database triggers queue notes for embedding
✅ **Content Deduplication** - SHA-256 hash prevents unnecessary re-embeddings
✅ **Scalable** - HNSW index for fast search with thousands of notes
✅ **Secure** - Row Level Security on all tables

---

## Next Steps

1. **Generate embeddings for existing notes** (see full docs)
2. **Set up background worker** for processing queue (optional but recommended)
3. **Integrate semantic search** into your UI
4. **Monitor embedding coverage** using provided SQL queries

---

## Full Documentation

See `VECTOR_DATABASE_SETUP.md` for:
- Detailed setup instructions
- Background worker configuration
- Monitoring and troubleshooting
- Best practices and cost management
- Advanced usage examples

---

## Architecture

```
User Creates/Updates Note
         ↓
   Database Trigger
         ↓
  Embedding Queue
         ↓
Background Worker (you set up)
         ↓
  Generate Embedding (via OpenRouter)
         ↓
Store in note_embeddings table
         ↓
    Available for Search!
```

---

## Cost Estimate

For 1000 notes @ 500 words each:
- **One-time**: $0.50 - $2.00
- **Per new note**: ~$0.001 - $0.002

Using `text-embedding-3-small` (recommended) is 5x cheaper than `ada-002`.

---

## Troubleshooting

**No search results?**
- Check: `SELECT COUNT(*) FROM note_embeddings`
- If 0, generate embeddings first

**"extension vector does not exist"?**
- Run: `CREATE EXTENSION IF NOT EXISTS vector;`

**Embeddings not auto-generating?**
- Triggers add to queue automatically
- You need to set up a background worker to process the queue

---

That's it! Your semantic search system is ready. 🎉
