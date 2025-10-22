# 📊 PGVECTOR SETUP - SQL MIGRATIONS FOR AI/RAG

**Date:** October 13, 2025  
**Purpose:** Enable vector embeddings and semantic search in Supabase  
**Phase:** 3B - AI/RAG Infrastructure

---

## 1. ENABLE PGVECTOR EXTENSION

Run this in Supabase SQL Editor:

```sql
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
```

**What this does:** Enables PostgreSQL vector operations for storing and searching embeddings.

---

## 2. VERIFY NOTE_EMBEDDINGS TABLE STRUCTURE

The `note_embeddings` table should already exist with these columns:

```sql
-- Verify table structure (just for reference, don't run if table exists)
CREATE TABLE IF NOT EXISTS note_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding VECTOR(1536),  -- OpenAI text-embedding-3-small uses 1536 dimensions
    content_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast note lookup
CREATE INDEX IF NOT EXISTS idx_note_embeddings_note_id ON note_embeddings(note_id);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_note_embeddings_user_id ON note_embeddings(user_id);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_note_embeddings_embedding 
ON note_embeddings USING hnsw (embedding vector_cosine_ops);
```

---

## 3. CREATE RPC FUNCTION: search_similar_notes

This function performs semantic search across user's notes:

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS search_similar_notes(JSONB, UUID, FLOAT, INT);

-- Create semantic search function
CREATE OR REPLACE FUNCTION search_similar_notes(
    query_embedding JSONB,
    user_id_param UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    embedding_vector VECTOR(1536);
BEGIN
    -- Convert JSONB to vector
    embedding_vector := query_embedding::TEXT::VECTOR(1536);
    
    RETURN QUERY
    SELECT 
        n.id AS note_id,
        n.title,
        COALESCE(n.content, n.extracted_text, '') AS content,
        1 - (ne.embedding <=> embedding_vector) AS similarity
    FROM note_embeddings ne
    INNER JOIN notes n ON ne.note_id = n.id
    WHERE ne.user_id = user_id_param
        AND 1 - (ne.embedding <=> embedding_vector) > match_threshold
    ORDER BY ne.embedding <=> embedding_vector
    LIMIT match_count;
END;
$$;
```

**What this does:**
- Takes a query embedding (as JSONB string)
- Converts it to vector format
- Searches `note_embeddings` for similar vectors using cosine distance
- Returns matching notes with similarity scores
- Only returns results above the threshold (default 0.7)
- Limits results to top N matches (default 5)

---

## 4. CREATE RPC FUNCTION: find_related_notes

This function finds notes related to a specific note:

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS find_related_notes(UUID, INT);

-- Create related notes function
CREATE OR REPLACE FUNCTION find_related_notes(
    source_note_id UUID,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    source_embedding VECTOR(1536);
    source_user_id UUID;
BEGIN
    -- Get the source note's embedding and user
    SELECT ne.embedding, ne.user_id 
    INTO source_embedding, source_user_id
    FROM note_embeddings ne
    WHERE ne.note_id = source_note_id
    LIMIT 1;
    
    -- If no embedding found, return empty
    IF source_embedding IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        n.id AS note_id,
        n.title,
        COALESCE(n.content, n.extracted_text, '') AS content,
        1 - (ne.embedding <=> source_embedding) AS similarity
    FROM note_embeddings ne
    INNER JOIN notes n ON ne.note_id = n.id
    WHERE ne.user_id = source_user_id
        AND ne.note_id != source_note_id  -- Exclude the source note itself
    ORDER BY ne.embedding <=> source_embedding
    LIMIT match_count;
END;
$$;
```

**What this does:**
- Takes a note ID
- Finds that note's embedding
- Searches for other notes with similar embeddings
- Returns top N most similar notes
- Excludes the source note from results

---

## 5. ADD RLS POLICIES TO NOTE_EMBEDDINGS

Ensure users can only access their own embeddings:

```sql
-- Enable RLS
ALTER TABLE note_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own note embeddings" ON note_embeddings;
DROP POLICY IF EXISTS "Users can insert their own note embeddings" ON note_embeddings;
DROP POLICY IF EXISTS "Users can update their own note embeddings" ON note_embeddings;
DROP POLICY IF EXISTS "Users can delete their own note embeddings" ON note_embeddings;

-- Policy: Users can view their own embeddings
CREATE POLICY "Users can view their own note embeddings"
ON note_embeddings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own embeddings
CREATE POLICY "Users can insert their own note embeddings"
ON note_embeddings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own embeddings
CREATE POLICY "Users can update their own note embeddings"
ON note_embeddings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own embeddings
CREATE POLICY "Users can delete their own note embeddings"
ON note_embeddings
FOR DELETE
USING (auth.uid() = user_id);
```

---

## 6. VERIFICATION QUERIES

After running the migrations, verify everything works:

### Check pgvector extension:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Check note_embeddings table:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'note_embeddings';
```

### Check RPC functions exist:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('search_similar_notes', 'find_related_notes')
AND routine_schema = 'public';
```

### Check RLS policies:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'note_embeddings';
```

---

## 🎯 EXECUTION ORDER

1. ✅ Enable pgvector extension
2. ✅ Verify/create note_embeddings table with indexes
3. ✅ Create search_similar_notes function
4. ✅ Create find_related_notes function
5. ✅ Add RLS policies

---

## 📝 NOTES

- **Embedding Dimensions:** OpenAI `text-embedding-3-small` uses **1536 dimensions**
- **Distance Metric:** Using cosine distance (`<=>` operator)
- **Similarity Score:** Converted to 0-1 range where 1 = identical, 0 = completely different
- **Performance:** HNSW index provides fast approximate nearest neighbor search

---

*Created: October 13, 2025*  
*Purpose: Phase 3B - AI/RAG Infrastructure Setup*
