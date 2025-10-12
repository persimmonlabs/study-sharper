-- Migration: Add storage quota columns to profiles
-- Date: 2025-10-12
-- Description: Adds storage tracking and limits to user profiles for file upload management

-- Add storage quota columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 2147483648; -- 2GB default (2 * 1024 * 1024 * 1024)

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

-- Add comments to document the columns
COMMENT ON COLUMN profiles.storage_used_bytes IS 'Total bytes of storage used by user for uploaded files';
COMMENT ON COLUMN profiles.storage_limit_bytes IS 'Maximum bytes of storage allowed (2GB default for free tier)';

-- Grant execute permissions on storage functions to authenticated users
GRANT EXECUTE ON FUNCTION increment_storage TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_storage TO authenticated;
GRANT EXECUTE ON FUNCTION check_storage_available TO authenticated;
