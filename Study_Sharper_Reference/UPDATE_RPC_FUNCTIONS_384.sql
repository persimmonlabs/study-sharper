-- Update RPC functions to use 384 dimensions instead of 1536
-- Run this in Supabase SQL Editor after updating the embedding column

-- 1. Update search_similar_notes function
DROP FUNCTION IF EXISTS search_similar_notes(JSONB, UUID, FLOAT, INT);

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
    embedding_vector VECTOR(384);  -- Changed from 1536 to 384
BEGIN
    -- Convert JSONB to vector
    embedding_vector := query_embedding::TEXT::VECTOR(384);
    
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

-- 2. Update find_related_notes function
DROP FUNCTION IF EXISTS find_related_notes(UUID, INT);

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
    source_embedding VECTOR(384);  -- Changed from 1536 to 384
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
        AND ne.note_id != source_note_id
    ORDER BY ne.embedding <=> source_embedding
    LIMIT match_count;
END;
$$;

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('search_similar_notes', 'find_related_notes')
AND routine_schema = 'public';
