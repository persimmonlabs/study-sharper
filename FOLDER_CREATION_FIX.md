# Folder Creation Fix - 500 Internal Server Error

## Issue
Folders were failing to create with a **500 Internal Server Error** response.

## Root Cause
The `note_folders` table in Supabase was missing two critical columns required for folder nesting functionality:
1. **`parent_folder_id`** - UUID reference to parent folder (for folder hierarchy)
2. **`depth`** - Integer tracking folder nesting level (0 = root, 1 = subfolder, max 2)

When the backend tried to insert these columns, the database rejected the insert because the columns didn't exist.

## Solution

### Step 1: Run Migration in Supabase (REQUIRED)
You must execute this SQL in your Supabase SQL Editor to add the missing columns:

```sql
-- Add parent_folder_id column (nullable, for root folders)
ALTER TABLE public.note_folders 
ADD COLUMN IF NOT EXISTS parent_folder_id uuid REFERENCES public.note_folders(id) ON DELETE CASCADE;

-- Add depth column (0 for root folders, 1 for subfolders)
ALTER TABLE public.note_folders 
ADD COLUMN IF NOT EXISTS depth integer DEFAULT 0 CHECK (depth >= 0 AND depth <= 2);

-- Create index on parent_folder_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_note_folders_parent_folder_id 
ON public.note_folders(parent_folder_id);

-- Create index on user_id and parent_folder_id for efficient folder hierarchy queries
CREATE INDEX IF NOT EXISTS idx_note_folders_user_parent 
ON public.note_folders(user_id, parent_folder_id);

-- Create index on depth for depth validation queries
CREATE INDEX IF NOT EXISTS idx_note_folders_depth 
ON public.note_folders(depth);
```

**Instructions:**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the SQL above
4. Click "Run"
5. Verify no errors appear

### Step 2: Backend Updates (COMPLETED)
The backend has been updated to support folder nesting:

#### Updated Files:
- **`app/api/folders.py`**
  - Updated `FolderCreate` model to accept `parent_folder_id`
  - Updated `FolderUpdate` model to accept `parent_folder_id`
  - Updated `Folder` response model to include `parent_folder_id` and `depth`
  - Enhanced `POST /api/folders` to calculate depth based on parent
  - Enhanced `PUT /api/folders/{id}` to validate parent and update depth
  - **Added `PATCH /api/folders/{id}`** for partial updates (used by frontend)
  - Added depth validation (max depth 2)
  - Added parent folder validation

#### New Migration File:
- **`migrations/010_add_folder_nesting.sql`** - Contains all SQL to add columns and indexes

## Folder Nesting Rules

### Maximum Depth: 2 Levels
```
Root Level (depth 0)
├── Folder A (depth 1)
│   └── Subfolder A1 (depth 2) ← Maximum depth
└── Folder B (depth 1)
    └── Subfolder B1 (depth 2) ← Maximum depth
```

### Validation Rules
- ✅ Can create root folder (parent_folder_id = null, depth = 0)
- ✅ Can create subfolder in root folder (parent_folder_id = folder.id, depth = 1)
- ✅ Can create sub-subfolder in subfolder (parent_folder_id = subfolder.id, depth = 2)
- ❌ Cannot create folder deeper than depth 2
- ❌ Cannot move folder into itself
- ❌ Cannot move folder into its children

## API Endpoints

### Create Folder
```
POST /api/folders
Content-Type: application/json

{
  "name": "My Folder",
  "color": "#3b82f6",
  "parent_folder_id": null  // Optional, null for root
}
```

### Update Folder (PUT)
```
PUT /api/folders/{folder_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "color": "#ef4444",
  "parent_folder_id": "parent-uuid"  // Optional
}
```

### Update Folder (PATCH - Partial)
```
PATCH /api/folders/{folder_id}
Content-Type: application/json

{
  "parent_folder_id": "new-parent-uuid"  // Only update what's needed
}
```

### Move Folder
```
PATCH /api/folders/{folder_id}
Content-Type: application/json

{
  "parent_folder_id": "target-folder-id"  // Move into target
}
```

### Move Folder to Root
```
PATCH /api/folders/{folder_id}
Content-Type: application/json

{
  "parent_folder_id": null  // Move to root
}
```

## Frontend Integration

The frontend automatically:
- Passes `parent_folder_id` when creating subfolders
- Calculates available folders for moving (respecting depth limits)
- Shows folder colors in move menu
- Prevents invalid moves (self, children, depth violations)

## Status

### ✅ Completed
- Backend endpoints updated
- PATCH endpoint added
- Depth validation implemented
- Migration file created

### ⏳ Required User Action
- **Run the migration SQL in Supabase** (see Step 1 above)

### 🔄 After Migration
- Folder creation will work immediately
- Folder moving will work
- Folder nesting will be enforced

## Troubleshooting

### Still getting 500 error after running migration?
1. Verify the migration ran without errors in Supabase
2. Check that columns exist: Go to Supabase → Tables → note_folders
3. Verify columns: `parent_folder_id` (uuid) and `depth` (integer)
4. Restart the backend service

### Columns already exist?
If you see "column already exists" errors, that's fine - the migration uses `IF NOT EXISTS` to prevent duplicates.

### Can't see the new columns?
1. Refresh the Supabase dashboard
2. Click on the `note_folders` table
3. Scroll right to see all columns
4. You should see `parent_folder_id` and `depth`

## Files Modified

### Backend
- `app/api/folders.py` - Updated endpoints and validation
- `migrations/010_add_folder_nesting.sql` - Migration file

### Frontend (Previously Completed)
- `src/components/files/FolderContextMenu.tsx` - Move functionality
- `src/lib/api/filesApi.ts` - API client support
- `src/app/files/page.tsx` - Folder context menu integration

## Next Steps

1. **Run the migration SQL** in Supabase (CRITICAL)
2. Test folder creation
3. Test folder moving
4. Test depth validation
5. Deploy to production
