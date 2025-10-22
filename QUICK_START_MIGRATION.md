# Quick Start: Notes to Files Migration

## ⚡ Fast Track Instructions

### Step 1: Backup Database (5 minutes)
Go to Supabase → Database → Backups → Create Backup

### Step 2: Run SQL Migration (2 minutes)
1. Open Supabase SQL Editor
2. Copy contents of `Study_Sharper_Backend/migrations/014_consolidate_notes_to_files.sql`
3. Paste and click "Run"
4. Wait for completion

### Step 3: Verify Migration (1 minute)
Run this in SQL Editor:
```sql
-- Should show your notes count
SELECT COUNT(*) FROM files;

-- Should be 0 (table dropped)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'notes';
```

### Step 4: Deploy Backend (automatic)
The code is already updated. Just wait for your hosting service (Render/Railway) to auto-deploy after you push:

```bash
cd Study_Sharper_Backend
git add .
git commit -m "feat: Consolidate notes into files system"
git push origin main
```

Wait 2-5 minutes for deployment.

### Step 5: Deploy Frontend (automatic)
```bash
cd Study_Sharper_Frontend
git add .
git commit -m "feat: Update navigation to Files"
git push origin main
```

Wait 1-2 minutes for deployment (Vercel auto-deploys).

### Step 6: Test (5 minutes)
1. Visit your app
2. Click "Files" in navigation (Notes link is removed)
3. Verify all your content is visible
4. Try uploading a new file
5. Try editing a file
6. Generate flashcards from a file

## ✅ Done!

Your notes and files are now unified in a single "Files" system.

---

## 🚨 If Something Goes Wrong

1. Restore from backup (Supabase → Backups → Restore)
2. Check `MIGRATION_NOTES_TO_FILES_COMPLETE.md` for detailed troubleshooting
3. Don't panic - your backup has everything

---

## 📋 What Changed

**User-Facing:**
- Navigation: "Notes" link → "Files" link
- All notes are now in the Files page
- Everything works the same, just unified

**Technical:**
- `notes` table merged into `files` table
- Backend API: `/api/notes` endpoints proxy to `/api/files`
- All functionality preserved (OCR, embeddings, flashcards, etc.)

---

**Total Time**: ~15 minutes  
**Difficulty**: Easy (if you follow steps exactly)  
**Risk**: Low (with backup)
