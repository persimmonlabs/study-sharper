# Migration: Consolidate Notes System into Files System

**Date**: 2025-01-21  
**Status**: ✅ **READY FOR TESTING**  
**Critical**: 🔴 **DESTRUCTIVE MIGRATION - BACKUP DATABASE FIRST**

---

## 📋 Overview

This migration consolidates the separate notes and files systems into a single unified files system. All note functionality is preserved and enhanced in the files system.

### What This Accomplishes

1. ✅ **Single Source of Truth**: One `files` table instead of separate `notes` and `files` tables
2. ✅ **Unified API**: All endpoints under `/api/files` with backward compatibility for `/api/notes`
3. ✅ **Preserved Functionality**: All features (text extraction, OCR, embeddings, flashcard generation) maintained
4. ✅ **Cleaner UX**: Single "Files" page in navigation instead of duplicate Notes/Files pages
5. ✅ **Future-Proof**: Easier to maintain and extend with unified schema

---

## ⚠️ CRITICAL: Before You Start

### 1. **BACKUP YOUR DATABASE**
```bash
# Option 1: Use Supabase Dashboard
# Go to Database → Backups → Create Backup

# Option 2: Use pg_dump (if you have direct access)
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. **Test on Development/Staging First**
**DO NOT** run this migration directly on production until you've tested it on a development database.

### 3. **Verify Current Data**
Before migration, note these counts for verification:
```sql
SELECT COUNT(*) FROM notes;
SELECT COUNT(*) FROM files;
SELECT COUNT(*) FROM note_embeddings;
SELECT COUNT(*) FROM file_embeddings;
```

---

## 🗂️ Files Modified

### Backend Changes
- ✅ `migrations/014_consolidate_notes_to_files.sql` - **New migration SQL**
- ✅ `app/main.py` - Removed notes router, consolidated into files
- ✅ `app/api/files.py` - Enhanced with all notes functionality + legacy compatibility endpoints

### Frontend Changes
- ✅ `components/layout/Sidebar.tsx` - Removed Notes link
- ✅ `components/layout/HeaderNav.tsx` - Changed Notes to Files
- ℹ️ `/app/notes/*` pages - **Leave in place** (see Note below)

**Note**: Old `/app/notes` pages can stay in the codebase temporarily for backward compatibility. Users who bookmarked `/notes` routes will automatically see the files page via API compatibility layer.

---

## 📝 Step-by-Step Migration Instructions

### **STEP 1: Review the Migration SQL**

The migration file is at: `Study_Sharper_Backend/migrations/014_consolidate_notes_to_files.sql`

**What it does:**
1. Adds missing columns to `files` table (summary, tags, transcription, ocr_processed, etc.)
2. Migrates all data from `notes` → `files`
3. Updates foreign keys: 
   - `flashcards.source_note_id` → `flashcards.source_file_id`
   - `study_sessions.note_id` → `study_sessions.file_id`
   - `embedding_queue.note_id` → `embedding_queue.file_id`
4. Migrates `note_embeddings` → `file_embeddings`
5. Consolidates `file_folders` and `note_folders` into `note_folders` (unified folder system)
6. Drops old tables: `notes`, `note_embeddings`, `embedding_queue`, `file_folders`
7. Creates indexes and RLS policies
8. Updates triggers

**Review the file carefully before proceeding.**

---

### **STEP 2: Run the Migration in Supabase**

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Copy the Migration SQL**
   - Open `migrations/014_consolidate_notes_to_files.sql`
   - Copy the entire contents

3. **Execute the Migration**
   - Paste into SQL Editor
   - **REVIEW ONE MORE TIME**
   - Click "Run" button

4. **Monitor Execution**
   - Watch for errors
   - Migration should complete in 10-60 seconds depending on data size
   - If any error occurs, **STOP IMMEDIATELY** and contact support

5. **Verify Success**
   ```sql
   -- Check that files table has all notes data
   SELECT COUNT(*) FROM files;
   
   -- Verify embeddings migrated
   SELECT COUNT(*) FROM file_embeddings;
   
   -- Verify foreign keys updated
   SELECT COUNT(*) FROM flashcards WHERE source_file_id IS NOT NULL;
   
   -- Confirm old tables are gone
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name IN ('notes', 'note_embeddings');
   -- Should return 0 rows
   ```

---

### **STEP 3: Deploy Backend Changes**

The backend code has already been updated in this codebase.

1. **Commit Changes**
   ```bash
   cd Study_Sharper_Backend
   git add .
   git commit -m "feat: Consolidate notes system into files system"
   git push origin main
   ```

2. **Wait for Auto-Deploy**
   - If using Render/Railway/Heroku: Watch deployment logs
   - Deployment should complete in 2-5 minutes
   - Backend will automatically use new `files` table

3. **Verify Backend**
   ```bash
   # Test files endpoint
   curl https://your-backend-url.com/api/files
   
   # Test legacy notes endpoint (should proxy to files)
   curl https://your-backend-url.com/api/notes
   ```

---

### **STEP 4: Deploy Frontend Changes**

1. **Commit Changes**
   ```bash
   cd Study_Sharper_Frontend
   git add .
   git commit -m "feat: Update navigation to use Files instead of Notes"
   git push origin main
   ```

2. **Build and Deploy**
   - If using Vercel: Auto-deploys on push
   - If manual: `npm run build && npm run start`

3. **Clear Browser Cache**
   - Users may need to hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Navigation should show "Files" instead of "Notes"

---

### **STEP 5: Verification & Testing**

Test these critical workflows:

#### **File Management**
- ✅ Create new markdown note via Files page
- ✅ Upload PDF file
- ✅ Upload DOCX file
- ✅ Edit file content
- ✅ Move file to folder
- ✅ Delete file
- ✅ Search files (text & semantic)

#### **Folders**
- ✅ Create folder
- ✅ Rename folder
- ✅ Delete folder (files should remain)
- ✅ Move files between folders

#### **Flashcard Generation**
- ✅ Generate flashcards from a file
- ✅ Verify `source_file_id` is set correctly
- ✅ Check that flashcards display source file

#### **Vector Search/Embeddings**
- ✅ Perform semantic search
- ✅ Verify results return from `file_embeddings` table
- ✅ Upload new file and verify embedding is generated

#### **Backend API Compatibility**
- ✅ Test `/api/files` endpoints
- ✅ Test `/api/notes` legacy endpoints (should proxy to files)

---

## 🔄 Rollback Plan

If something goes wrong, you can rollback:

### **Option 1: Restore from Backup**
```sql
-- Use Supabase Dashboard: Database → Backups → Restore

-- Or if you have pg_dump backup:
psql your_database < backup_20250121_HHMMSS.sql
```

### **Option 2: Recreate Notes Table** (if backup not available)
This is complex and **NOT RECOMMENDED**. Contact support for assistance.

---

## 📊 Database Schema Changes Summary

### **Tables Modified**
| Table | Change | Status |
|-------|--------|--------|
| `files` | Added columns: summary, tags, transcription, ocr_processed, edited_manually, subject | ✅ |
| `flashcards` | Renamed column: source_note_id → source_file_id | ✅ |
| `study_sessions` | Renamed column: note_id → file_id | ✅ |
| `flashcard_sets` | Renamed column: source_note_ids → source_file_ids | ✅ |

### **Tables Dropped**
- ❌ `notes` - Data migrated to `files`
- ❌ `note_embeddings` - Data migrated to `file_embeddings`
- ❌ `embedding_queue` - Recreated with file_id reference
- ❌ `file_folders` - Merged into `note_folders`

### **Indexes Created**
- `idx_files_user_id_updated_at`
- `idx_files_folder_id`
- `idx_files_processing_status`
- `idx_file_embeddings_user_id`
- `idx_flashcards_source_file_id`
- `idx_study_sessions_file_id`

---

## 🔍 API Changes

### **New Unified Endpoints**
All under `/api/files`:

```
GET    /api/files                 - List files (lightweight, paginated)
GET    /api/files/{id}            - Get full file details
POST   /api/files                 - Create file
PATCH  /api/files/{id}            - Update file
DELETE /api/files/{id}            - Delete file
GET    /api/folders               - List folders
POST   /api/folders               - Create folder
PATCH  /api/folders/{id}          - Update folder
DELETE /api/folders/{id}          - Delete folder
GET    /api/quota                 - Get quota status
```

### **Legacy Compatibility Endpoints**
These proxy to the files API for backward compatibility:

```
GET    /api/notes                 - Proxies to /api/files
GET    /api/notes/{id}            - Proxies to /api/files/{id}
POST   /api/notes                 - Proxies to /api/files
PATCH  /api/notes/{id}            - Proxies to /api/files/{id}
PUT    /api/notes/{id}            - Proxies to /api/files/{id}
DELETE /api/notes/{id}            - Proxies to /api/files/{id}
```

**No frontend code changes needed** for API calls! The legacy endpoints ensure existing API calls continue working.

---

## 🎯 What Users Will See

### **Before Migration**
- Navigation: "Dashboard, Files, Notes, Study..."
- Two separate pages for managing content
- Confusion about where to put things

### **After Migration**
- Navigation: "Dashboard, Files, Study..."
- Single "Files" page with all functionality
- Cleaner, more intuitive experience
- All existing content visible in Files page

---

## 🐛 Troubleshooting

### **Issue: Migration fails with foreign key error**
**Solution**: Run these queries to check for orphaned records:
```sql
-- Check for flashcards with invalid source_note_id
SELECT COUNT(*) FROM flashcards 
WHERE source_note_id IS NOT NULL 
AND source_note_id NOT IN (SELECT id FROM notes);

-- Check for study_sessions with invalid note_id
SELECT COUNT(*) FROM study_sessions 
WHERE note_id IS NOT NULL 
AND note_id NOT IN (SELECT id FROM notes);
```

If any found, clean them up before re-running migration.

### **Issue: Files page shows no content after migration**
**Solution**: 
1. Check if data exists: `SELECT COUNT(*) FROM files;`
2. Verify user_id matches: `SELECT user_id FROM files LIMIT 5;`
3. Check browser console for API errors
4. Verify backend is deployed and using new code

### **Issue: Flashcard generation fails**
**Solution**:
1. Verify column was renamed: `\d flashcards` (should show source_file_id)
2. Check flashcard service code references `source_file_id` not `source_note_id`
3. Clear any cached queries

### **Issue: Semantic search returns no results**
**Solution**:
1. Verify embeddings migrated: `SELECT COUNT(*) FROM file_embeddings;`
2. Check file_id foreign keys: `SELECT COUNT(*) FROM file_embeddings WHERE file_id NOT IN (SELECT id FROM files);`
3. Re-generate embeddings if needed

---

## 📞 Support

If you encounter any issues during migration:

1. **DO NOT PANIC** - Your backup has everything
2. **STOP THE MIGRATION** - Don't proceed if errors occur
3. **DOCUMENT THE ERROR** - Copy exact error message
4. **CHECK LOGS** - Backend logs, Supabase logs, browser console
5. **RESTORE FROM BACKUP** - If needed, restore and try again

---

## ✅ Post-Migration Checklist

- [ ] Database migration completed successfully
- [ ] Verification queries all passed
- [ ] Backend deployed and responding
- [ ] Frontend deployed with updated navigation
- [ ] File upload tested
- [ ] File editing tested
- [ ] Folder management tested
- [ ] Flashcard generation tested
- [ ] Semantic search tested
- [ ] Legacy `/api/notes` endpoints tested
- [ ] Users notified of navigation change
- [ ] Documentation updated
- [ ] Old `/app/notes` pages removed (optional - can wait)

---

## 📈 Performance Improvements

This migration provides:

- **Faster Queries**: Single table instead of union queries
- **Better Indexes**: Optimized for common access patterns
- **Cleaner Schema**: Easier to maintain and extend
- **Unified Caching**: Single cache strategy for all files
- **Reduced Complexity**: One API surface instead of two

---

## 🎉 Success Criteria

Migration is successful when:

1. ✅ All notes data is in files table
2. ✅ File embeddings are populated
3. ✅ Flashcards reference source_file_id correctly
4. ✅ Files page shows all user content
5. ✅ Upload/edit/delete workflows work
6. ✅ Flashcard generation works from files
7. ✅ Semantic search returns results
8. ✅ No errors in backend logs
9. ✅ Users can access all their content

---

## 📝 Notes

- The old `/app/notes` frontend pages can remain in the codebase temporarily
- Users who have `/notes` routes bookmarked will see the files page (backend compatibility)
- Consider adding a redirect from `/notes` → `/files` in Next.js routing later
- The migration is idempotent - safe to run multiple times (uses `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

---

**Last Updated**: 2025-01-21  
**Migration File**: `migrations/014_consolidate_notes_to_files.sql`  
**Backend Status**: ✅ Ready  
**Frontend Status**: ✅ Ready  
**Documentation**: ✅ Complete
