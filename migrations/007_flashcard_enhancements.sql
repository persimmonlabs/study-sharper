-- ============================================================================
-- FLASHCARD ENHANCEMENTS MIGRATION
-- Adds support for auto-suggestions, AI chat, and manual creation
-- ============================================================================

-- Add fields to flashcard_sets table
ALTER TABLE flashcard_sets
ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suggestion_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT TRUE;

-- Create flashcard_chat_history table for AI chatbot context
CREATE TABLE IF NOT EXISTS flashcard_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    context JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient chat history retrieval
CREATE INDEX IF NOT EXISTS idx_flashcard_chat_history_user_created 
ON flashcard_chat_history(user_id, created_at DESC);

-- Create index for suggested flashcards
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_suggested 
ON flashcard_sets(user_id, is_suggested, suggestion_date DESC) 
WHERE is_suggested = TRUE;

-- Add RLS policies for flashcard_chat_history
ALTER TABLE flashcard_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history"
ON flashcard_chat_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
ON flashcard_chat_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history"
ON flashcard_chat_history FOR DELETE
USING (auth.uid() = user_id);

-- Create function to clean old chat history (keep last 50 messages per user)
CREATE OR REPLACE FUNCTION cleanup_old_flashcard_chat_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM flashcard_chat_history
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM flashcard_chat_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        LIMIT 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-cleanup chat history
DROP TRIGGER IF EXISTS trigger_cleanup_flashcard_chat_history ON flashcard_chat_history;
CREATE TRIGGER trigger_cleanup_flashcard_chat_history
AFTER INSERT ON flashcard_chat_history
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_flashcard_chat_history();

-- Create function to get suggested flashcard sets
CREATE OR REPLACE FUNCTION get_suggested_flashcard_sets(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    source_note_ids UUID[],
    total_cards INTEGER,
    mastered_cards INTEGER,
    suggestion_date TIMESTAMPTZ,
    is_accepted BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.id,
        fs.title,
        fs.description,
        fs.source_note_ids,
        fs.total_cards,
        fs.mastered_cards,
        fs.suggestion_date,
        fs.is_accepted,
        fs.created_at,
        fs.updated_at
    FROM flashcard_sets fs
    WHERE fs.user_id = p_user_id
    AND fs.is_suggested = TRUE
    AND (fs.is_accepted IS NULL OR fs.is_accepted = TRUE)
    ORDER BY fs.suggestion_date DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE flashcard_chat_history IS 'Stores AI chat history for flashcard generation context';
COMMENT ON FUNCTION get_suggested_flashcard_sets IS 'Retrieves suggested flashcard sets for a user';
