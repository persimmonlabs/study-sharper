# Debug Upload Issues - Step by Step

## Current Status
- ✅ Backend running on http://127.0.0.1:8000
- ✅ Frontend running on http://localhost:3000
- ✅ Event loop conflict fixed
- ❌ Files still not finishing processing

---

## Step 1: Check Backend is Running

### **In Backend Terminal:**
Look for:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

If not running:
```bash
cd Study_Sharper_Backend
python -m uvicorn app.main:app --reload
```

---

## Step 2: Check Frontend Configuration

### **Verify .env.local exists:**
```bash
cd Study_Sharper_Frontend
cat .env.local  # or: type .env.local on Windows
```

Should contain:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

If `NEXT_PUBLIC_API_URL` is missing or wrong, **that's the problem!**

---

## Step 3: Test Backend Directly

### **Open PowerShell and test:**

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
# Should return: {"status":"healthy"}

# Test CORS
$headers = @{"Origin" = "http://localhost:3000"}
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Headers $headers
# Should return: {"status":"healthy"}
```

---

## Step 4: Monitor Backend Logs During Upload

### **What to look for in backend terminal:**

#### **✅ Successful Upload:**
```
INFO: POST /api/upload - 200 OK
INFO: Queued text extraction for note {note_id}
INFO: Starting processing for note {note_id}
INFO: Downloaded file {file_path} (X bytes)
✓ File {note_id}: Extracted with PyPDF
INFO: Successfully extracted X chars using pypdf
INFO: Deleted original file {file_path} from storage
INFO: Successfully processed note {note_id}
INFO: Background processing completed for note {note_id}
```

#### **❌ Common Errors:**

**1. Import Error:**
```
ModuleNotFoundError: No module named 'pypdf'
```
**Fix:** `pip install pypdf`

**2. Supabase Error:**
```
Error: Invalid API key
```
**Fix:** Check `SUPABASE_SERVICE_ROLE_KEY` in backend `.env`

**3. Storage Error:**
```
Storage download failed: File not found
```
**Fix:** Check Supabase storage bucket exists and is accessible

**4. Event Loop Error (should be fixed):**
```
RuntimeError: asyncio.run() cannot be called from a running event loop
```
**Fix:** Already applied - restart backend

---

## Step 5: Check Browser Console

### **Open DevTools (F12) → Console Tab**

#### **✅ Successful Upload:**
```
[fetchWithRetry] Attempt 1/4 for http://127.0.0.1:8000/api/upload
POST http://127.0.0.1:8000/api/upload 200 OK
[Notes] File uploaded successfully
[Notes] Starting polling for note {note_id}
[Notes] Note {note_id} status: processing
[Notes] Note {note_id} status: completed
[Notes] Stopping polling for note {note_id}
```

#### **❌ Common Errors:**

**1. Wrong API URL:**
```
POST http://localhost:3000/api/upload 404 (Not Found)
```
**Fix:** Add `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` to `.env.local`

**2. CORS Error:**
```
Access to fetch at 'http://127.0.0.1:8000' from origin 'http://localhost:3000' has been blocked by CORS
```
**Fix:** Check `ALLOWED_ORIGINS` in backend `.env`

**3. Network Error:**
```
Failed to fetch
```
**Fix:** Backend not running or wrong URL

---

## Step 6: Check Database

### **In Supabase Dashboard:**

1. Go to **Table Editor** → **notes** table
2. Find your uploaded note
3. Check the `processing_status` column:
   - `pending` = Queued, not started yet
   - `processing` = Currently processing (should change to completed)
   - `completed` = ✅ Done
   - `failed` = ❌ Error (check `error_message` column)

If stuck on `processing`:
- Backend might have crashed
- Check backend terminal for errors
- Restart backend

---

## Step 7: Manual Test Upload

### **Test with a simple text file first:**

1. Create a test file: `test.txt` with content: "Hello World"
2. Try uploading it
3. Check if it processes

If text files work but PDFs don't:
- PDF extraction might be failing
- Check backend logs for specific error

---

## Step 8: Check File Permissions

### **Supabase Storage:**

1. Go to **Storage** → **notes-pdfs** bucket
2. Check **Policies** tab
3. Ensure policies allow:
   - INSERT for authenticated users
   - SELECT for authenticated users
   - DELETE for authenticated users

---

## Common Issues & Solutions

### **Issue 1: Files Stuck on "Processing"**

**Symptoms:**
- Status never changes from "processing"
- No completion or error

**Causes:**
- Backend crashed during processing
- Event loop conflict (should be fixed)
- Extraction function threw unhandled exception

**Debug:**
```bash
# Check backend logs
# Look for errors after "Starting processing for note..."
```

**Fix:**
- Restart backend
- Check for Python errors in terminal
- Verify all dependencies installed: `pip install -r requirements.txt`

---

### **Issue 2: 404 on Upload**

**Symptoms:**
- `POST http://localhost:3000/api/upload 404`

**Cause:**
- Frontend trying to upload to itself instead of backend

**Fix:**
```bash
# Create/update Study_Sharper_Frontend/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# Restart frontend
npm run dev
```

---

### **Issue 3: CORS Error**

**Symptoms:**
- "blocked by CORS policy"

**Cause:**
- Backend not configured to allow frontend origin

**Fix:**
```bash
# In Study_Sharper_Backend/.env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Restart backend
python -m uvicorn app.main:app --reload
```

---

### **Issue 4: Supabase Auth Error**

**Symptoms:**
- "Invalid API key" or "Unauthorized"

**Cause:**
- Wrong Supabase credentials

**Fix:**
```bash
# Backend .env - Use SERVICE ROLE KEY (not anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Frontend .env.local - Use ANON KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Quick Checklist

Before uploading a file, verify:

- [ ] Backend running on http://127.0.0.1:8000
- [ ] Frontend running on http://localhost:3000
- [ ] `.env.local` has `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
- [ ] Backend `.env` has correct Supabase credentials
- [ ] Backend `.env` has `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- [ ] Browser console shows no errors
- [ ] Backend terminal shows no errors

---

## Test Commands

### **Test Backend Health:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```

### **Test Frontend API URL:**
Open browser console and run:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
// Should show: http://127.0.0.1:8000
```

### **Check Backend Logs:**
Watch backend terminal during upload for any errors

---

## Still Not Working?

### **Collect Debug Info:**

1. **Backend Terminal Output** (during upload attempt)
2. **Browser Console Output** (F12 → Console tab)
3. **Network Tab** (F12 → Network tab, filter: Fetch/XHR)
4. **Supabase Table** (notes table, processing_status column)

Share these and we can diagnose the exact issue!

---

## Next Steps

1. Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Restart both frontend and backend
3. Try uploading a file
4. Watch backend terminal for logs
5. Check browser console for errors
6. Report what you see!
