# Critical Fix - Missing Database Tables

## Issue Found

**Requests were hanging because two critical tables don't exist in your Supabase database:**

1. **`note_folders`** - For organizing notes into folders
2. **`user_quotas`** - For tracking storage and upload limits

When the backend tried to insert into these non-existent tables, the requests hung indefinitely.

## Root Cause

The migration files that create these tables were never executed in Supabase. The backend code assumes they exist, but they don't.

## Solution

You need to manually run the SQL migration in Supabase to create these tables.

## Step-by-Step Instructions

### Step 1: Go to Supabase Dashboard
1. Open: https://app.supabase.com
2. Select your **Study Sharper** project
3. Go to **SQL Editor** (left sidebar)

### Step 2: Create note_folders Table
Copy and paste this SQL into the SQL Editor:

```sql
-- Create note_folders table for organizing notes
CREATE TABLE IF NOT EXISTS note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);

-- Enable RLS
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own folders
CREATE POLICY "Users can view their own folders" ON note_folders
    FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy: users can create their own folders
CREATE POLICY "Users can create their own folders" ON note_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: users can update their own folders
CREATE POLICY "Users can update their own folders" ON note_folders
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy: users can delete their own folders
CREATE POLICY "Users can delete their own folders" ON note_folders
    FOR DELETE USING (auth.uid() = user_id);
```

Click **Run** (or press Ctrl+Enter)

### Step 3: Create user_quotas Table
Copy and paste this SQL into the SQL Editor:

```sql
-- Create user_quotas table for tracking storage and upload limits
CREATE TABLE IF NOT EXISTS user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_premium BOOLEAN DEFAULT FALSE,
    files_uploaded_today INTEGER DEFAULT 0,
    last_upload_reset_date DATE DEFAULT CURRENT_DATE,
    total_storage_used BIGINT DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    storage_limit BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);

-- Enable RLS
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own quota
CREATE POLICY "Users can view their own quota" ON user_quotas
    FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy: users can update their own quota (for admin operations)
CREATE POLICY "Users can update their own quota" ON user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy: service role can do anything (for backend)
CREATE POLICY "Service role can manage quotas" ON user_quotas
    FOR ALL USING (auth.role() = 'service_role');
```

Click **Run** (or press Ctrl+Enter)

### Step 4: Verify Tables Were Created
Go to **Table Editor** (left sidebar) and verify you see:
- ✅ `note_folders` table
- ✅ `user_quotas` table

## After Running Migrations

1. **Wait 2-3 minutes** for Render to auto-deploy the backend
2. **Clear browser cache** (Ctrl+Shift+Delete) or use **incognito mode**
3. Go to: https://study-sharper.vercel.app/files
4. Try **creating a folder** → Should work ✅
5. Try **creating a manual note** → Should work ✅

## Expected Results

### Before (Hanging)
- Click "Create Folder" → Loading spinner forever
- Click "Create Note" → Loading spinner forever
- No errors in console

### After (Working)
- Click "Create Folder" → Folder appears instantly
- Click "Create Note" → Note appears instantly
- Console shows: `[filesApi] Folder created successfully`

## Why This Happened

The backend code was written to use these tables, but the database migrations that create them were never run in production. This is a **database schema mismatch** issue.

## Prevention

All future migrations should be:
1. Created in `migrations/` folder
2. Committed to GitHub
3. Manually run in Supabase SQL Editor (or automated via CI/CD)

## Files Modified

- ✅ Created: `migrations/008_create_user_quotas.sql`
- ✅ Committed to GitHub
- ⏳ Waiting for you to run in Supabase

## Summary

**Root Cause**: Missing database tables (`note_folders`, `user_quotas`)
**Fix**: Run the SQL migration in Supabase SQL Editor
**Status**: Migration file created and pushed to GitHub
**Next Step**: Run the SQL in Supabase (see instructions above)

---

**⚠️ IMPORTANT**: Please run both SQL statements in Supabase now, then test the file creation. Let me know once you've completed this step!
