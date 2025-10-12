-- Migration: Create note_folders table
-- Date: 2025-10-12
-- Description: Creates note_folders table for organizing notes into colored folders

-- Create note_folders table
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS note_folders_user_id_idx ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS note_folders_created_at_idx ON note_folders(created_at DESC);

-- Now add the foreign key constraint to notes table
ALTER TABLE notes 
    ADD CONSTRAINT notes_folder_id_fkey 
    FOREIGN KEY (folder_id) 
    REFERENCES note_folders(id) 
    ON DELETE SET NULL;

-- Add comment to document the table
COMMENT ON TABLE note_folders IS 'Stores user-created folders for organizing notes';
COMMENT ON COLUMN note_folders.name IS 'Display name of the folder';
COMMENT ON COLUMN note_folders.color IS 'Hex color code for folder UI (e.g., #FF5733)';
