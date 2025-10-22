-- CHECK CURRENT EMBEDDING COLUMN DIMENSION
-- Run this in Supabase SQL Editor to see current vector dimension

SELECT 
    column_name, 
    data_type, 
    udt_name,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'note_embeddings' AND column_name = 'embedding';

-- If the embedding column is vector(1536), we need to change it to vector(384)
-- for sentence-transformers/all-MiniLM-L6-v2

-- OPTION 1: If table is empty or you don't mind recreating embeddings
-- Drop and recreate the column with correct dimensions
ALTER TABLE note_embeddings DROP COLUMN IF EXISTS embedding;
ALTER TABLE note_embeddings ADD COLUMN embedding VECTOR(384);

-- Recreate the HNSW index for fast similarity search
DROP INDEX IF EXISTS idx_note_embeddings_embedding;
CREATE INDEX idx_note_embeddings_embedding 
ON note_embeddings USING hnsw (embedding vector_cosine_ops);

-- OPTION 2: If you have existing embeddings you want to keep
-- You'll need to regenerate them with the new model
-- Just truncate the table first:
-- TRUNCATE TABLE note_embeddings;
-- Then run the above ALTER commands

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'note_embeddings' AND column_name = 'embedding';
