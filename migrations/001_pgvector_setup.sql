-- ============================================================
-- Study Sharper - Vector Database Migration
-- Enables pgvector for semantic note search
-- ============================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create note_embeddings table
-- This table stores vector embeddings for each note
CREATE TABLE note_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI ada-002 and similar models use 1536 dimensions
    content_hash TEXT, -- Hash of content to detect changes
    model TEXT NOT NULL DEFAULT 'openai/text-embedding-ada-002',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one embedding per note
    UNIQUE(note_id)
);

-- Step 3: Create indexes for performance
-- Index for fast note_id lookups
CREATE INDEX note_embeddings_note_id_idx ON note_embeddings(note_id);

-- Index for user-based queries
CREATE INDEX note_embeddings_user_id_idx ON note_embeddings(user_id);

-- HNSW index for fast vector similarity search
-- Using cosine distance (most common for text embeddings)
CREATE INDEX note_embeddings_embedding_idx ON note_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (use if HNSW is not available)
-- CREATE INDEX note_embeddings_embedding_ivf_idx ON note_embeddings 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Step 4: Enable Row Level Security
ALTER TABLE note_embeddings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for note_embeddings
-- Users can view their own embeddings
CREATE POLICY "Users can view own note embeddings" ON note_embeddings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own embeddings
CREATE POLICY "Users can insert own note embeddings" ON note_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own embeddings
CREATE POLICY "Users can update own note embeddings" ON note_embeddings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users can delete own note embeddings" ON note_embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at_note_embeddings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
CREATE TRIGGER handle_updated_at_note_embeddings_trigger
    BEFORE UPDATE ON note_embeddings
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at_note_embeddings();

-- Step 8: Create function to calculate content hash
CREATE OR REPLACE FUNCTION calculate_content_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 9: Create function for similarity search
CREATE OR REPLACE FUNCTION search_similar_notes(
    query_embedding vector(1536),
    user_id_param UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.summary,
        1 - (ne.embedding <=> query_embedding) as similarity
    FROM note_embeddings ne
    JOIN notes n ON ne.note_id = n.id
    WHERE 
        ne.user_id = user_id_param
        AND 1 - (ne.embedding <=> query_embedding) > match_threshold
    ORDER BY ne.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 10: Create function to find related notes for a given note
CREATE OR REPLACE FUNCTION find_related_notes(
    source_note_id UUID,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    summary TEXT,
    similarity FLOAT
) AS $$
DECLARE
    source_embedding vector(1536);
    source_user_id UUID;
BEGIN
    -- Get the embedding and user_id of the source note
    SELECT ne.embedding, ne.user_id 
    INTO source_embedding, source_user_id
    FROM note_embeddings ne
    WHERE ne.note_id = source_note_id;
    
    -- If no embedding found, return empty result
    IF source_embedding IS NULL THEN
        RETURN;
    END IF;
    
    -- Find similar notes
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.summary,
        1 - (ne.embedding <=> source_embedding) as similarity
    FROM note_embeddings ne
    JOIN notes n ON ne.note_id = n.id
    WHERE 
        ne.user_id = source_user_id
        AND ne.note_id != source_note_id -- Exclude the source note itself
    ORDER BY ne.embedding <=> source_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 11: Create view for notes with embeddings status
CREATE OR REPLACE VIEW notes_with_embeddings AS
SELECT 
    n.*,
    CASE 
        WHEN ne.id IS NOT NULL THEN true 
        ELSE false 
    END as has_embedding,
    ne.updated_at as embedding_updated_at,
    ne.model as embedding_model
FROM notes n
LEFT JOIN note_embeddings ne ON n.id = ne.note_id;

COMMENT ON TABLE note_embeddings IS 'Stores vector embeddings for semantic search of notes';
COMMENT ON COLUMN note_embeddings.embedding IS 'Vector embedding of note content (1536 dimensions for OpenAI models)';
COMMENT ON COLUMN note_embeddings.content_hash IS 'SHA256 hash of note content to detect changes';
COMMENT ON FUNCTION search_similar_notes IS 'Finds notes similar to a query embedding using cosine similarity';
COMMENT ON FUNCTION find_related_notes IS 'Finds notes related to a specific note based on embedding similarity';
