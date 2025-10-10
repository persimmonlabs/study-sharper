-- ============================================================
-- Study Sharper - Embedding Triggers and Automation
-- Sets up triggers to flag notes for embedding generation
-- ============================================================

-- Step 1: Create a table to track notes that need embedding updates
CREATE TABLE IF NOT EXISTS embedding_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate queue entries
    UNIQUE(note_id, status)
);

-- Create indexes for the queue
CREATE INDEX embedding_queue_status_idx ON embedding_queue(status);
CREATE INDEX embedding_queue_priority_idx ON embedding_queue(priority);
CREATE INDEX embedding_queue_note_id_idx ON embedding_queue(note_id);
CREATE INDEX embedding_queue_user_id_idx ON embedding_queue(user_id);

-- Enable RLS
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for embedding_queue
CREATE POLICY "Users can view own embedding queue" ON embedding_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage embedding queue" ON embedding_queue
    FOR ALL USING (true);

-- Step 2: Function to add note to embedding queue
CREATE OR REPLACE FUNCTION queue_note_for_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if the note has content
    IF (NEW.content IS NOT NULL AND NEW.content != '') 
       OR (NEW.extracted_text IS NOT NULL AND NEW.extracted_text != '') THEN
        
        -- Insert into queue (ignore if already exists with same status)
        INSERT INTO embedding_queue (note_id, user_id, priority)
        VALUES (NEW.id, NEW.user_id, 5)
        ON CONFLICT (note_id, status) 
        DO UPDATE SET 
            updated_at = NOW(),
            retry_count = 0,
            priority = CASE 
                WHEN TG_OP = 'UPDATE' THEN 3  -- Higher priority for updates
                ELSE embedding_queue.priority
            END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create triggers on notes table
-- Trigger for new notes
CREATE TRIGGER queue_new_note_for_embedding
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION queue_note_for_embedding();

-- Trigger for updated notes (only if content changed)
CREATE TRIGGER queue_updated_note_for_embedding
    AFTER UPDATE OF content, extracted_text, title ON notes
    FOR EACH ROW
    WHEN (
        OLD.content IS DISTINCT FROM NEW.content OR
        OLD.extracted_text IS DISTINCT FROM NEW.extracted_text OR
        OLD.title IS DISTINCT FROM NEW.title
    )
    EXECUTE FUNCTION queue_note_for_embedding();

-- Step 4: Function to get next batch of notes to process
CREATE OR REPLACE FUNCTION get_embedding_queue_batch(
    batch_size INT DEFAULT 10
)
RETURNS TABLE (
    queue_id UUID,
    note_id UUID,
    user_id UUID,
    title TEXT,
    content TEXT,
    extracted_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eq.id,
        n.id,
        n.user_id,
        n.title,
        n.content,
        n.extracted_text
    FROM embedding_queue eq
    JOIN notes n ON eq.note_id = n.id
    WHERE eq.status = 'pending'
    ORDER BY eq.priority ASC, eq.created_at ASC
    LIMIT batch_size
    FOR UPDATE OF eq SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Function to mark embedding queue item as processing
CREATE OR REPLACE FUNCTION mark_embedding_processing(queue_ids UUID[])
RETURNS void AS $$
BEGIN
    UPDATE embedding_queue
    SET status = 'processing', updated_at = NOW()
    WHERE id = ANY(queue_ids);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Function to mark embedding queue item as completed
CREATE OR REPLACE FUNCTION mark_embedding_completed(queue_ids UUID[])
RETURNS void AS $$
BEGIN
    DELETE FROM embedding_queue
    WHERE id = ANY(queue_ids) AND status = 'processing';
END;
$$ LANGUAGE plpgsql;

-- Step 7: Function to mark embedding queue item as failed
CREATE OR REPLACE FUNCTION mark_embedding_failed(
    queue_id_param UUID,
    error_msg TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE embedding_queue
    SET 
        status = CASE 
            WHEN retry_count >= 3 THEN 'failed'
            ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        error_message = error_msg,
        updated_at = NOW(),
        priority = priority + 1  -- Lower priority on retry
    WHERE id = queue_id_param;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Function to check if note needs embedding update
CREATE OR REPLACE FUNCTION note_needs_embedding_update(note_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    note_hash TEXT;
    embedding_hash TEXT;
    has_embedding BOOLEAN;
BEGIN
    -- Get note content hash
    SELECT calculate_content_hash(
        COALESCE(title, '') || E'\n\n' || 
        COALESCE(content, '') || E'\n\n' || 
        COALESCE(extracted_text, '')
    )
    INTO note_hash
    FROM notes
    WHERE id = note_id_param;
    
    -- Get embedding hash
    SELECT content_hash, (content_hash IS NOT NULL)
    INTO embedding_hash, has_embedding
    FROM note_embeddings
    WHERE note_id = note_id_param;
    
    -- Return true if no embedding exists or hashes don't match
    RETURN (NOT has_embedding) OR (note_hash != embedding_hash);
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 9: Create a view to see queue status
CREATE OR REPLACE VIEW embedding_queue_status AS
SELECT 
    eq.status,
    COUNT(*) as count,
    AVG(eq.retry_count) as avg_retries
FROM embedding_queue eq
GROUP BY eq.status;

-- Step 10: Function to cleanup old completed/failed queue items
CREATE OR REPLACE FUNCTION cleanup_embedding_queue()
RETURNS void AS $$
BEGIN
    DELETE FROM embedding_queue
    WHERE 
        (status = 'completed' AND updated_at < NOW() - INTERVAL '7 days')
        OR (status = 'failed' AND updated_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE embedding_queue IS 'Queue for notes that need embedding generation or updates';
COMMENT ON FUNCTION queue_note_for_embedding IS 'Automatically queues notes for embedding when created or updated';
COMMENT ON FUNCTION get_embedding_queue_batch IS 'Gets a batch of notes from the queue for processing';
COMMENT ON VIEW embedding_queue_status IS 'Overview of embedding queue status';
