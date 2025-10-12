-- ============================================================================
-- PHASE 1 CONSOLIDATED MIGRATION
-- Date: 2025-10-12
-- Description: Complete database schema updates for Study Sharper Phase 1
-- Instructions: Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add missing columns to notes table
-- ============================================================================

ALTER TABLE notes ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Add comments to document the columns
COMMENT ON COLUMN notes.file_path IS 'Path to uploaded file in Supabase storage (if note was created from file upload)';
COMMENT ON COLUMN notes.extracted_text IS 'Raw text extracted from uploaded file (PDF, DOCX, etc.)';
COMMENT ON COLUMN notes.file_size IS 'Size of uploaded file in bytes';
COMMENT ON COLUMN notes.folder_id IS 'ID of the folder this note belongs to (NULL if not in a folder)';

-- ============================================================================
-- PART 2: Create note_folders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS note_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for note_folders
CREATE POLICY "Users can view own folders" ON note_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON note_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON note_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON note_folders
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS note_folders_user_id_idx ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS note_folders_created_at_idx ON note_folders(created_at DESC);

-- Add foreign key constraint from notes to note_folders
ALTER TABLE notes 
    DROP CONSTRAINT IF EXISTS notes_folder_id_fkey;
    
ALTER TABLE notes 
    ADD CONSTRAINT notes_folder_id_fkey 
    FOREIGN KEY (folder_id) 
    REFERENCES note_folders(id) 
    ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE note_folders IS 'Stores user-created folders for organizing notes';
COMMENT ON COLUMN note_folders.name IS 'Display name of the folder';
COMMENT ON COLUMN note_folders.color IS 'Hex color code for folder UI (e.g., #FF5733)';

-- ============================================================================
-- PART 3: Add storage quota tracking to profiles
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 2147483648; -- 2GB default

-- Create function to increment storage usage
CREATE OR REPLACE FUNCTION increment_storage(user_id_param UUID, delta BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + delta
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement storage usage (for deletions)
CREATE OR REPLACE FUNCTION decrement_storage(user_id_param UUID, delta BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET storage_used_bytes = GREATEST(COALESCE(storage_used_bytes, 0) - delta, 0)
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has available storage
CREATE OR REPLACE FUNCTION check_storage_available(user_id_param UUID, required_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage BIGINT;
    storage_limit BIGINT;
BEGIN
    SELECT storage_used_bytes, storage_limit_bytes
    INTO current_usage, storage_limit
    FROM profiles
    WHERE id = user_id_param;
    
    RETURN (COALESCE(current_usage, 0) + required_bytes) <= COALESCE(storage_limit, 2147483648);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN profiles.storage_used_bytes IS 'Total bytes of storage used by user for uploaded files';
COMMENT ON COLUMN profiles.storage_limit_bytes IS 'Maximum bytes of storage allowed (2GB default for free tier)';

-- Grant execute permissions on storage functions
GRANT EXECUTE ON FUNCTION increment_storage TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_storage TO authenticated;
GRANT EXECUTE ON FUNCTION check_storage_available TO authenticated;

-- ============================================================================
-- PART 4: Additional performance indexes
-- ============================================================================

-- Ensure all critical indexes exist
CREATE INDEX IF NOT EXISTS assignments_due_date_status_idx ON assignments(due_date, status);
CREATE INDEX IF NOT EXISTS study_sessions_note_id_idx ON study_sessions(note_id);
CREATE INDEX IF NOT EXISTS study_sessions_assignment_id_idx ON study_sessions(assignment_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Verify with these queries:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notes';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';
-- SELECT * FROM pg_tables WHERE tablename = 'note_folders';
