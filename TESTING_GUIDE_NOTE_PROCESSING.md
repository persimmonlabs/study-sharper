# 🧪 Testing Guide: Note Upload & Text Extraction System

## Quick Start Testing

### Prerequisites
- ✅ Database migration executed (005_add_note_processing_status.sql)
- ✅ Backend server running
- ✅ Frontend development server running
- ✅ Authenticated user session

---

## Test Scenarios

### ✅ Test 1: Successful PDF Upload
**Objective:** Verify complete processing flow for valid PDF

**Steps:**
1. Navigate to Notes page
2. Click "Choose Files" or drag-drop a PDF file
3. Select a valid PDF with text content
4. Observe upload completes immediately

**Expected Results:**
- ✅ Note appears in list with spinner icon
- ✅ Status shows "Processing file..."
- ✅ Note is greyed out and not clickable
- ✅ After 2-10 seconds, spinner disappears
- ✅ Note becomes fully visible and clickable
- ✅ Opening note shows extracted text in content

**Backend Verification:**
```sql
-- Check in Supabase SQL Editor
SELECT id, title, processing_status, extraction_method, error_message 
FROM notes 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 5;
```
Should show: `processing_status = 'completed'`, `extraction_method = 'native_pdf'`

---

### ✅ Test 2: DOCX Upload
**Objective:** Verify DOCX file processing

**Steps:**
1. Upload a .docx file with formatted text
2. Wait for processing to complete

**Expected Results:**
- ✅ Processing completes successfully
- ✅ Extracted text includes content
- ✅ Headings converted to markdown (if present)
- ✅ `extraction_method = 'docx'` in database

---

### ⚠️ Test 3: Failed Processing (Scanned PDF)
**Objective:** Verify error handling for unsupported files

**Steps:**
1. Upload a scanned PDF (image-based, no text layer)
2. Wait for processing

**Expected Results:**
- ✅ Note appears with spinner initially
- ✅ After processing, red border appears
- ✅ Error icon (⚠️) displayed
- ✅ Status shows "⚠️ Processing failed"
- ✅ Note is clickable (can view error details)
- ✅ Right-click shows "Retry Processing" option

**Backend Verification:**
```sql
SELECT id, title, processing_status, error_message 
FROM notes 
WHERE processing_status = 'failed';
```
Should show error message explaining failure

---

### 🔄 Test 4: Retry Failed Note
**Objective:** Verify retry functionality

**Steps:**
1. Right-click on a failed note
2. Select "Retry Processing"
3. Observe status changes

**Expected Results:**
- ✅ Context menu closes
- ✅ Note status resets to "Processing file..."
- ✅ Spinner appears again
- ✅ Polling resumes automatically
- ✅ If file still fails, error state returns
- ✅ If file succeeds (after fix), note completes

---

### 🔄 Test 5: Polling Mechanism
**Objective:** Verify automatic status updates

**Steps:**
1. Upload a file
2. Open browser DevTools → Network tab
3. Filter for `/status` requests
4. Observe polling behavior

**Expected Results:**
- ✅ Status endpoint called every 2 seconds
- ✅ Polling starts immediately after upload
- ✅ Polling stops when status = 'completed' or 'failed'
- ✅ No polling for completed notes
- ✅ UI updates automatically without refresh

---

### 📱 Test 6: Multiple File Upload
**Objective:** Verify concurrent processing

**Steps:**
1. Upload 3-5 files simultaneously
2. Observe all notes in list

**Expected Results:**
- ✅ All notes appear immediately
- ✅ All show processing indicators
- ✅ Polling happens for all simultaneously
- ✅ Each completes independently
- ✅ UI updates correctly for each

---

### 🔒 Test 7: File Cleanup
**Objective:** Verify original files are deleted after processing

**Steps:**
1. Upload a file
2. Note the file path (check database)
3. Wait for processing to complete
4. Check Supabase Storage

**Expected Results:**
- ✅ Original file deleted from storage after success
- ✅ Only extracted text remains in database
- ✅ File preserved in storage if processing fails

**Verification:**
Go to Supabase Dashboard → Storage → notes-pdfs bucket
- Successful notes: File should be deleted
- Failed notes: File should still exist

---

### 🚫 Test 8: Invalid File Type
**Objective:** Verify unsupported file handling

**Steps:**
1. Try uploading .txt, .jpg, or other unsupported file
2. Observe behavior

**Expected Results:**
- ✅ File upload may be blocked by file picker
- ✅ If uploaded, processing fails gracefully
- ✅ Clear error message displayed

---

### 🔄 Test 9: Page Refresh During Processing
**Objective:** Verify state persistence

**Steps:**
1. Upload a file
2. While processing, refresh the page
3. Observe note status

**Expected Results:**
- ✅ Note still shows processing status
- ✅ Polling resumes automatically
- ✅ Status updates continue
- ✅ Processing completes normally

---

### 📊 Test 10: Large File Handling
**Objective:** Verify performance with large files

**Steps:**
1. Upload a PDF > 5MB
2. Monitor processing time
3. Check memory usage

**Expected Results:**
- ✅ Upload completes quickly (non-blocking)
- ✅ Processing may take longer (10-30 seconds)
- ✅ No browser freezing
- ✅ Memory usage remains stable
- ✅ Extraction completes successfully

---

## API Testing (Optional)

### Test Status Endpoint
```bash
# Get session token from browser DevTools → Application → Local Storage
TOKEN="your_session_token"
NOTE_ID="note_uuid"

# Check status
curl -X GET "http://localhost:8000/api/notes/${NOTE_ID}/status" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "id": "note_uuid",
  "processing_status": "completed",
  "extraction_method": "native_pdf",
  "error_message": null
}
```

### Test Process Endpoint
```bash
# Trigger processing
curl -X POST "http://localhost:8000/api/notes/${NOTE_ID}/process" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Processing started",
  "note_id": "note_uuid"
}
```

---

## Common Issues & Solutions

### Issue: Notes stuck in "Processing" state
**Solution:**
1. Check backend logs for errors
2. Verify background task is running
3. Manually check database status
4. Try retry functionality

### Issue: Polling not starting
**Solution:**
1. Check browser console for errors
2. Verify status endpoint is accessible
3. Check authentication token is valid
4. Refresh page to restart polling

### Issue: Extracted text is empty
**Solution:**
1. Verify PDF has text layer (not scanned)
2. Check backend logs for extraction errors
3. Try different PDF file
4. Verify PyPDF is installed correctly

### Issue: Original file not deleted
**Solution:**
1. Check backend logs for storage errors
2. Verify Supabase storage permissions
3. Check if processing actually completed
4. Manual cleanup may be needed

---

## Performance Benchmarks

### Expected Processing Times
- Small PDF (< 1MB, 10 pages): 2-5 seconds
- Medium PDF (1-5MB, 50 pages): 5-15 seconds
- Large PDF (5-10MB, 100+ pages): 15-30 seconds
- DOCX files: 1-3 seconds (usually faster than PDF)

### Polling Overhead
- Status check: < 100ms per request
- Polling interval: 2 seconds
- Network overhead: Minimal (small JSON response)

---

## Success Criteria

✅ **All tests pass without errors**  
✅ **Processing completes within expected timeframes**  
✅ **UI updates automatically without manual refresh**  
✅ **Error states are clear and actionable**  
✅ **Retry functionality works reliably**  
✅ **No memory leaks or performance degradation**  
✅ **File cleanup works correctly**  
✅ **Polling stops when appropriate**

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Document any issues found
3. ✅ Fix critical bugs before deployment
4. ✅ Deploy to staging environment
5. ✅ Run tests again in staging
6. ✅ Deploy to production
7. ✅ Monitor logs for first 24 hours
8. ✅ Gather user feedback

---

**Happy Testing! 🚀**
