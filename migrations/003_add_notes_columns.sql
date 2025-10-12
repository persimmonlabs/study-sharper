-- Migration: Add missing columns to notes table
-- Date: 2025-10-12
-- Description: Adds file_path, extracted_text, file_size, and folder_id columns to support file uploads and folder organization

-- Add missing columns to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID;

-- Add foreign key constraint for folder_id (after note_folders table is created)
-- This will be added in the next migration after note_folders table exists

-- Create index for performance on folder_id lookups
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);

-- Create index for performance on updated_at for sorting
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Add comment to document the columns
COMMENT ON COLUMN notes.file_path IS 'Path to uploaded file in Supabase storage (if note was created from file upload)';
COMMENT ON COLUMN notes.extracted_text IS 'Raw text extracted from uploaded file (PDF, DOCX, etc.)';
COMMENT ON COLUMN notes.file_size IS 'Size of uploaded file in bytes';
COMMENT ON COLUMN notes.folder_id IS 'ID of the folder this note belongs to (NULL if not in a folder)';
