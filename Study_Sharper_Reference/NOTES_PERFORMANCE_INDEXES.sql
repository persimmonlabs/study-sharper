-- ============================================================================
-- NOTES PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================
-- Purpose: Improve query performance for notes page loading
-- These indexes optimize the most common queries:
-- 1. Fetching all notes for a user ordered by updated_at
-- 2. Fetching a single note by ID and user_id
-- ============================================================================

-- Index for listing notes (GET /api/notes)
-- Optimizes: SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC
-- This is a composite index that supports both filtering and sorting
CREATE INDEX IF NOT EXISTS idx_notes_user_updated 
ON notes (user_id, updated_at DESC);

-- Index for fetching single note (GET /api/notes/{id})
-- Optimizes: SELECT * FROM notes WHERE id = ? AND user_id = ?
-- This composite index ensures fast lookups for individual notes
CREATE INDEX IF NOT EXISTS idx_notes_id_user 
ON notes (id, user_id);

-- Index for folder-based queries
-- Optimizes: SELECT * FROM notes WHERE user_id = ? AND folder_id = ?
CREATE INDEX IF NOT EXISTS idx_notes_user_folder 
ON notes (user_id, folder_id);

-- ============================================================================
-- VERIFICATION QUERIES (OPTIONAL - FOR TESTING ONLY)
-- ============================================================================
-- After creating the indexes above, you can optionally run these queries
-- to verify they were created successfully.

-- Check all indexes on notes table
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'notes'
ORDER BY 
    indexname;

-- ============================================================================
-- PERFORMANCE TESTING (OPTIONAL)
-- ============================================================================
-- To test query performance, replace 'REPLACE-WITH-ACTUAL-UUID' with a real
-- user_id from your database, then run:
--
-- EXPLAIN ANALYZE 
-- SELECT id, user_id, title, tags, folder_id, file_path, created_at, updated_at
-- FROM notes 
-- WHERE user_id = 'REPLACE-WITH-ACTUAL-UUID' 
-- ORDER BY updated_at DESC;
--
-- Look for "Index Scan using idx_notes_user_updated" in the output

-- ============================================================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================================================
-- Before indexes:
--   - Sequential scan on notes table (slow with 1000+ notes)
--   - Query time: 500-2000ms for large datasets
--
-- After indexes:
--   - Index scan using idx_notes_user_updated
--   - Query time: < 50ms even with 10,000+ notes
--
-- Cache hit performance:
--   - Cached notes: < 100ms (instant from client cache)
--   - Uncached notes: < 500ms (API fetch + render)
-- ============================================================================

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================
-- These indexes will be automatically maintained by PostgreSQL
-- No manual maintenance required
-- Indexes may slightly slow down INSERT/UPDATE operations (negligible)
-- Benefits far outweigh costs for read-heavy workloads
-- ============================================================================
