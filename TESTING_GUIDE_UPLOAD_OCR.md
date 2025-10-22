# Testing Guide: Upload Optimization & OCR Premium Gate

## Quick Start

### 1. Start the Backend
```bash
cd Study_Sharper_Backend
python -m uvicorn app.main:app --reload
```

### 2. Start the Frontend
```bash
cd Study_Sharper_Frontend
npm run dev
```

### 3. Open Browser
Navigate to `http://localhost:3000/notes`

---

## Test Scenarios

### ✅ Test 1: Normal PDF Upload (Text-based)
**Purpose:** Verify fast processing without OCR gate

**Steps:**
1. Upload a normal PDF with text (e.g., a document from Word)
2. Observe the upload process

**Expected Results:**
- ✅ No premium gate dialog appears
- ✅ File uploads immediately
- ✅ Processing status shows "pending" → "processing" → "completed"
- ✅ Completes in 2-10 seconds
- ✅ Text is extracted and visible in note

**Console Logs to Check:**
```
[Notes] Starting parallel data load...
✓ File {file_id}: Extracted with PyPDF
Background processing completed for note {note_id}
```

---

### ✅ Test 2: Scanned PDF Upload (OCR Required)
**Purpose:** Verify OCR detection and premium gate

**Steps:**
1. Upload a scanned PDF (image-based, no selectable text)
2. Wait for OCR detection (< 1 second)
3. Observe premium gate dialog

**Expected Results:**
- ✅ Premium gate dialog appears
- ✅ Dialog shows:
  - 🔒 Premium Feature Required
  - File name
  - OCR explanation
  - Premium benefits list
  - Cancel and Proceed buttons
- ✅ Cancel button closes dialog, no upload
- ✅ Proceed button uploads with limited extraction

**Console Logs to Check:**
```
[checkOcrRequirement] Checking file: {filename}
OCR check response: { needs_ocr: true, file_type: "application/pdf" }
```

**Dialog Content:**
```
Premium Feature Required
OCR Processing Needed

{filename} appears to be a scanned document and requires OCR (Optical Character Recognition) for text extraction.

✨ OCR Processing is a Premium Feature
Upgrade to Premium to unlock:
• OCR text extraction from scanned PDFs
• Unlimited file uploads
• Advanced AI features
• Priority processing

Note: You can still upload this file, but text extraction will be limited.

[Cancel Upload] [Proceed Anyway]
```

---

### ✅ Test 3: Delete During Processing
**Purpose:** Verify cancellation works without errors

**Steps:**
1. Upload a large PDF file
2. Immediately click delete while status is "pending" or "processing"
3. Confirm deletion

**Expected Results:**
- ✅ Note disappears from UI immediately
- ✅ No errors in browser console
- ✅ No errors in backend logs
- ✅ Backend logs show cancellation message

**Console Logs to Check:**
```
Backend:
Note {note_id} was deleted, cancelling processing

Frontend:
[Notes] Note deleted successfully
```

---

### ✅ Test 4: Multiple File Upload
**Purpose:** Verify concurrent uploads work correctly

**Steps:**
1. Select 3-5 PDF files at once
2. Upload all together
3. Observe processing

**Expected Results:**
- ✅ All files upload simultaneously
- ✅ Each file processes independently
- ✅ OCR check happens for each PDF
- ✅ Premium gate appears for scanned PDFs only
- ✅ All files complete successfully

---

### ✅ Test 5: DOCX Upload
**Purpose:** Verify DOCX files bypass OCR check

**Steps:**
1. Upload a DOCX file
2. Observe the upload process

**Expected Results:**
- ✅ No OCR check performed (DOCX doesn't need OCR)
- ✅ No premium gate dialog
- ✅ Fast processing (2-5 seconds)
- ✅ Text extracted correctly

---

### ✅ Test 6: Large File Upload
**Purpose:** Verify file size warning still works

**Steps:**
1. Upload a PDF larger than 1MB
2. Observe file size warning dialog

**Expected Results:**
- ✅ File size warning appears (existing feature)
- ✅ OCR check happens AFTER file size check
- ✅ If user proceeds with large file, OCR check runs
- ✅ If scanned, premium gate appears after file size warning

---

### ✅ Test 7: Network Error Handling
**Purpose:** Verify graceful error handling

**Steps:**
1. Stop the backend server
2. Try to upload a file
3. Restart backend and try again

**Expected Results:**
- ✅ Clear error message shown
- ✅ No stuck loading states
- ✅ Can retry after backend restarts
- ✅ No corrupted state

---

### ✅ Test 8: Corrupted PDF
**Purpose:** Verify error handling for bad files

**Steps:**
1. Upload a corrupted or encrypted PDF
2. Observe error handling

**Expected Results:**
- ✅ Processing status changes to "failed"
- ✅ Error message displayed
- ✅ Red border around note
- ✅ Retry button available
- ✅ Clear error message: "This PDF appears to be encrypted, corrupted..."

---

## Performance Benchmarks

### Expected Processing Times

| File Type | Size | Expected Time |
|-----------|------|---------------|
| Text PDF | < 1MB | 2-5 seconds |
| Text PDF | 1-5MB | 5-10 seconds |
| Complex PDF | < 5MB | 10-15 seconds |
| DOCX | < 1MB | 2-5 seconds |
| Scanned PDF* | < 5MB | 15-30 seconds |

*With OCR enabled (Premium)

### OCR Check Speed
- **Target:** < 1 second
- **Method:** Reads first 500KB, checks 3 pages
- **Fallback:** If check fails, assumes OCR needed

---

## Common Issues & Solutions

### Issue: OCR check takes too long
**Solution:** Check backend logs, verify pypdf is installed
```bash
pip install pypdf
```

### Issue: Premium gate doesn't appear for scanned PDFs
**Solution:** 
1. Check OCR check endpoint response
2. Verify file is actually scanned (no selectable text)
3. Check browser console for errors

### Issue: Delete during processing causes errors
**Solution:**
1. Check backend logs for cancellation message
2. Verify note is deleted from database first
3. Ensure background task checks for existence

### Issue: Files stuck in "processing"
**Solution:**
1. Check backend logs for errors
2. Verify text_extraction_v2.py exists
3. Check import statements in note_processor.py

---

## Browser Console Commands

### Check OCR for a file manually
```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])

fetch('/api/notes/check-ocr', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
}).then(r => r.json()).then(console.log)
```

### Monitor upload status
```javascript
// Watch for processing notes
setInterval(() => {
  const processing = document.querySelectorAll('[data-status="processing"]')
  console.log(`Processing: ${processing.length} notes`)
}, 1000)
```

---

## Success Criteria

### ✅ All tests pass
- [ ] Normal PDF uploads quickly (< 10 seconds)
- [ ] Scanned PDFs show premium gate
- [ ] Delete during processing works without errors
- [ ] Multiple uploads work concurrently
- [ ] DOCX files upload successfully
- [ ] Error handling is graceful
- [ ] No console errors
- [ ] No stuck states

### ✅ Performance targets met
- [ ] OCR check completes in < 1 second
- [ ] Text PDF processing in 2-10 seconds
- [ ] No memory leaks
- [ ] Smooth user experience

### ✅ User experience is polished
- [ ] Premium gate is clear and professional
- [ ] Cancellation is instant
- [ ] Error messages are helpful
- [ ] No confusing states

---

## Ready for Production

Once all tests pass, the upload optimization and OCR premium gate are ready for deployment!

**No database migrations required** - All changes are code-only.
