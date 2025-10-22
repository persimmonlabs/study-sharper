# 🧪 Testing Guide: Phase 2 OCR & Enhanced Extraction

## Prerequisites

### System Dependencies Installed
- ✅ Tesseract OCR installed and in PATH
- ✅ Poppler installed and in PATH
- ✅ Python packages installed (`pip install -r requirements.txt`)
- ✅ Database migration 006 executed
- ✅ Backend server running
- ✅ Frontend development server running

### Verify Installation
```bash
# Test Tesseract
tesseract --version
# Should show: tesseract 5.x.x

# Test Poppler
pdftoppm -v
# Should show version info

# Test Python imports
python -c "import pytesseract, pdf2image; print('✅ All imports OK')"
```

---

## 🎯 Test Scenarios

### Test 1: Text-Based PDF (PyPDF Success)
**Objective:** Verify PyPDF extraction works for standard PDFs

**Test File:** Any standard PDF with text (e.g., research paper, ebook)

**Steps:**
1. Navigate to Notes page
2. Upload a text-based PDF file
3. Observe processing

**Expected Results:**
- ✅ Processing completes in 2-10 seconds
- ✅ Text extracted successfully
- ✅ No "Scanned" badge appears
- ✅ Note is fully clickable and readable

**Backend Verification:**
```sql
SELECT id, title, extraction_method, ocr_processed, processing_status
FROM notes
WHERE id = 'YOUR_NOTE_ID';
```
Should show:
- `extraction_method = 'native_pdf'`
- `ocr_processed = FALSE`
- `processing_status = 'completed'`

---

### Test 2: Complex PDF (pdfminer Fallback)
**Objective:** Verify pdfminer.six handles PDFs that PyPDF struggles with

**Test File:** PDF with complex layouts, tables, or multi-column text

**Steps:**
1. Upload a complex PDF
2. Monitor backend logs
3. Wait for processing

**Expected Results:**
- ✅ PyPDF may fail or extract < 50 characters
- ✅ pdfminer.six succeeds
- ✅ Processing takes 5-15 seconds
- ✅ No "Scanned" badge

**Backend Logs Should Show:**
```
PyPDF extraction insufficient: Extracted text too short
Successfully extracted PDF text using pdfminer.six
```

**Database Check:**
```sql
SELECT extraction_method, ocr_processed
FROM notes WHERE id = 'YOUR_NOTE_ID';
```
Should show:
- `extraction_method = 'pdfminer'`
- `ocr_processed = FALSE`

---

### Test 3: Scanned PDF (OCR Success) ⭐ CRITICAL
**Objective:** Verify OCR extraction works for scanned documents

**Test File:** Scanned document or image-based PDF (< 5MB, < 20 pages)

**Steps:**
1. Upload a scanned PDF
2. Observe processing (will take longer)
3. Check for "Scanned" badge

**Expected Results:**
- ✅ Processing takes 15-60 seconds (depending on pages)
- ✅ Blue "Scanned" badge appears in both sidebar and grid
- ✅ Text extracted from scanned pages
- ✅ Note is readable

**Backend Logs Should Show:**
```
PyPDF extraction insufficient: ...
PDFMiner extraction insufficient: ...
Starting OCR extraction for XX.XKB file
Converted PDF to N images
Processing OCR batch 1-5 of N
OCR extraction successful: XXXX characters from N pages
Successfully extracted PDF text using OCR
OCR was required for this document
```

**Database Check:**
```sql
SELECT extraction_method, ocr_processed, LENGTH(extracted_text) as text_length
FROM notes WHERE id = 'YOUR_NOTE_ID';
```
Should show:
- `extraction_method = 'ocr'`
- `ocr_processed = TRUE`
- `text_length > 50`

**UI Verification:**
- Badge appears in sidebar: "📄 Scanned"
- Badge appears in Recent Files grid
- Badge is blue with document icon

---

### Test 4: Large Scanned PDF (Size Limit)
**Objective:** Verify 5MB size limit for OCR

**Test File:** Scanned PDF > 5MB

**Steps:**
1. Upload a large scanned PDF (> 5MB)
2. Wait for processing

**Expected Results:**
- ✅ Processing fails with specific error
- ✅ Error message mentions file size
- ✅ Status = 'failed'
- ✅ Red error indicator appears
- ✅ Original file preserved

**Expected Error Message:**
```
"File too large for OCR processing (7.2MB). Please upload a text-based PDF 
or smaller file (max 5MB for OCR)."
```

**Backend Logs:**
```
PyPDF extraction insufficient: ...
PDFMiner extraction insufficient: ...
File too large for OCR processing (X.XMB). Please upload a text-based PDF...
```

**Retry Test:**
- Right-click note → "Retry Processing"
- Should fail again with same error
- Consider compressing PDF or using text-based version

---

### Test 5: Multi-Page Scanned PDF
**Objective:** Verify batch processing handles multiple pages

**Test File:** Scanned PDF with 10-15 pages (< 5MB)

**Steps:**
1. Upload multi-page scanned PDF
2. Monitor backend logs for batch processing
3. Wait for completion

**Expected Results:**
- ✅ Processing takes 30-60 seconds
- ✅ All pages processed
- ✅ Text from all pages combined
- ✅ "Scanned" badge appears

**Backend Logs Should Show:**
```
Converted PDF to 15 images
Processing OCR batch 1-5 of 15
Processing OCR batch 6-10 of 15
Processing OCR batch 11-15 of 15
OCR extraction successful: XXXX characters from 15 pages
```

**Verify Content:**
- Open note and check content
- Should see text from all pages
- May see "--- Page X ---" separators

---

### Test 6: Encrypted/Password-Protected PDF
**Objective:** Verify handling of encrypted PDFs

**Test File:** Password-protected PDF

**Steps:**
1. Upload encrypted PDF
2. Wait for processing

**Expected Results:**
- ✅ All extraction methods fail
- ✅ Status = 'failed'
- ✅ Error mentions encryption
- ✅ Red error indicator

**Expected Error:**
```
"This PDF appears to be encrypted, corrupted, or contains no readable text. 
Please try a different file or ensure the PDF is not password-protected."
```

---

### Test 7: Corrupted PDF
**Objective:** Verify handling of corrupted files

**Test File:** Corrupted or malformed PDF

**Steps:**
1. Upload corrupted PDF
2. Wait for processing

**Expected Results:**
- ✅ Processing fails gracefully
- ✅ Error message is informative
- ✅ No server crash
- ✅ Original file preserved

---

### Test 8: Memory Stress Test
**Objective:** Verify memory stays under control during OCR

**Test Files:** 3-5 scanned PDFs (each 2-4MB)

**Steps:**
1. Upload multiple scanned PDFs simultaneously
2. Monitor system memory usage
3. Wait for all to complete

**Expected Results:**
- ✅ All files process successfully
- ✅ Memory usage stays under 500MB per process
- ✅ No memory leaks
- ✅ All show "Scanned" badges
- ✅ Server remains responsive

**Monitoring:**
```bash
# Watch memory usage
watch -n 1 'ps aux | grep python | grep -v grep'

# Or use htop
htop -p $(pgrep -f "python.*main.py")
```

---

### Test 9: Poor Quality Scan
**Objective:** Verify OCR handles low-quality scans

**Test File:** Low-resolution or blurry scanned document

**Steps:**
1. Upload poor quality scan
2. Wait for OCR processing

**Expected Results:**
- ✅ OCR attempts extraction
- ✅ May extract partial or garbled text
- ✅ Completes without crashing
- ✅ "Scanned" badge appears
- ⚠️ Text quality may be poor (expected)

**Note:** This is a limitation of OCR technology, not a bug.

---

### Test 10: DOCX File (Baseline)
**Objective:** Verify DOCX extraction still works

**Test File:** Standard DOCX file

**Steps:**
1. Upload DOCX file
2. Wait for processing

**Expected Results:**
- ✅ Extracts quickly (1-3 seconds)
- ✅ `extraction_method = 'docx'`
- ✅ `ocr_processed = FALSE`
- ✅ No "Scanned" badge

---

## 🔍 Backend Log Analysis

### Successful PyPDF Extraction
```
[INFO] Starting processing for note abc123
[INFO] Downloaded file user_id/note_id.pdf (1234567 bytes)
[INFO] Successfully extracted 5432 chars using native_pdf
[INFO] Successfully processed note abc123
```

### Successful pdfminer Extraction
```
[WARNING] PyPDF extraction insufficient: Extracted text too short
[INFO] Successfully extracted PDF text using pdfminer.six
[INFO] Successfully extracted 4321 chars using pdfminer
```

### Successful OCR Extraction
```
[WARNING] PyPDF extraction insufficient: ...
[WARNING] PDFMiner extraction insufficient: ...
[INFO] Starting OCR extraction for 2048.5KB file
[INFO] Converted PDF to 10 images
[INFO] Processing OCR batch 1-5 of 10
[INFO] Processing OCR batch 6-10 of 10
[INFO] OCR extraction successful: 8765 characters from 10 pages
[INFO] Successfully extracted PDF text using OCR
[INFO] OCR was required for this document
```

### Failed Extraction (Too Large)
```
[WARNING] PyPDF extraction insufficient: ...
[WARNING] PDFMiner extraction insufficient: ...
[WARNING] File too large for OCR processing (6.2MB). Please upload...
[ERROR] Processing failed for note abc123: File too large for OCR...
```

---

## 📊 Performance Benchmarks

### Expected Processing Times

| File Type | Size | Pages | Expected Time | Method |
|-----------|------|-------|---------------|--------|
| Text PDF | 1MB | 10 | 2-5 sec | PyPDF |
| Complex PDF | 2MB | 20 | 5-10 sec | pdfminer |
| Scanned PDF | 1MB | 5 | 15-25 sec | OCR |
| Scanned PDF | 3MB | 10 | 30-45 sec | OCR |
| Scanned PDF | 5MB | 20 | 50-70 sec | OCR |

### Memory Usage

| Scenario | Expected Peak Memory |
|----------|---------------------|
| Text PDF (PyPDF) | 50-100 MB |
| Complex PDF (pdfminer) | 100-150 MB |
| Scanned PDF (OCR, 5 pages) | 200-300 MB |
| Scanned PDF (OCR, 20 pages) | 300-500 MB |
| Multiple OCR (3 files) | 400-600 MB total |

---

## ✅ Success Criteria

### Functional Requirements
- [x] PyPDF extracts text-based PDFs successfully
- [x] pdfminer.six handles complex PDFs
- [x] OCR processes scanned documents
- [x] 5MB size limit enforced for OCR
- [x] Batch processing works (5 pages at a time)
- [x] Memory stays under 500MB per process
- [x] "Scanned" badge appears for OCR notes
- [x] Error messages are clear and actionable
- [x] Retry functionality works for failed notes

### Performance Requirements
- [x] Text PDFs process in < 10 seconds
- [x] Scanned PDFs (< 10 pages) process in < 30 seconds
- [x] Scanned PDFs (10-20 pages) process in < 60 seconds
- [x] No memory leaks during extended use
- [x] Server remains responsive during OCR

### User Experience
- [x] Processing status updates in real-time
- [x] Clear visual feedback (spinner, error icon, badge)
- [x] Informative error messages
- [x] One-click retry for failures
- [x] No UI blocking during processing

---

## 🐛 Common Issues & Solutions

### Issue: OCR not working
**Symptoms:** All scanned PDFs fail with "OCR extraction failed"

**Check:**
1. Tesseract installed: `tesseract --version`
2. Poppler installed: `pdftoppm -v`
3. Python packages: `pip list | grep -E "pytesseract|pdf2image"`
4. Backend logs for specific error

**Solution:**
- Reinstall Tesseract/Poppler
- Add to PATH
- Restart backend server

### Issue: "Scanned" badge not appearing
**Symptoms:** OCR works but badge doesn't show

**Check:**
1. Database: `SELECT ocr_processed FROM notes WHERE id = 'X'`
2. Frontend console for errors
3. Browser cache (hard refresh: Ctrl+Shift+R)

**Solution:**
- Verify database field is TRUE
- Clear browser cache
- Check frontend code for badge rendering

### Issue: Memory usage too high
**Symptoms:** Server crashes or becomes unresponsive during OCR

**Check:**
1. File sizes being processed
2. Number of concurrent OCR operations
3. System available memory

**Solution:**
- Reduce OCR_BATCH_SIZE (currently 5)
- Reduce MAX_OCR_PAGES (currently 20)
- Increase server memory
- Limit concurrent uploads

### Issue: OCR takes too long
**Symptoms:** Processing times exceed 2 minutes

**Check:**
1. File size (should be < 5MB)
2. Number of pages
3. Server CPU resources

**Solution:**
- Reduce MAX_OCR_PAGES if needed
- Consider reducing DPI (currently 200)
- Upgrade server CPU
- Implement progress indicators

---

## 📈 Analytics Queries

### Check Extraction Method Distribution
```sql
SELECT 
  extraction_method,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM notes
WHERE processing_status = 'completed'
  AND extraction_method IS NOT NULL
GROUP BY extraction_method
ORDER BY count DESC;
```

**Expected Results:**
- native_pdf: ~70%
- pdfminer: ~15%
- ocr: ~10-15%
- docx: ~5%

### Check OCR Usage
```sql
SELECT 
  COUNT(*) as total_notes,
  COUNT(CASE WHEN ocr_processed THEN 1 END) as ocr_notes,
  ROUND(COUNT(CASE WHEN ocr_processed THEN 1 END) * 100.0 / COUNT(*), 2) as ocr_percentage
FROM notes
WHERE processing_status = 'completed';
```

### Find Slow Processing Notes
```sql
SELECT 
  id,
  title,
  extraction_method,
  ocr_processed,
  file_size_bytes / 1024 / 1024 as size_mb,
  updated_at - created_at as processing_time
FROM notes
WHERE processing_status = 'completed'
  AND (updated_at - created_at) > INTERVAL '30 seconds'
ORDER BY processing_time DESC
LIMIT 10;
```

---

## 🎯 Final Checklist

Before marking Phase 2 complete:

- [ ] All 10 test scenarios pass
- [ ] PyPDF extraction works
- [ ] pdfminer.six fallback works
- [ ] OCR extraction works
- [ ] "Scanned" badges appear correctly
- [ ] 5MB size limit enforced
- [ ] Memory usage stays under 500MB
- [ ] Error messages are clear
- [ ] Retry functionality works
- [ ] Backend logs are informative
- [ ] No memory leaks detected
- [ ] Performance meets benchmarks
- [ ] Documentation is complete

---

## 🚀 Next Steps After Testing

1. **Fix any issues found**
2. **Deploy to staging environment**
3. **Run tests again in staging**
4. **Monitor logs for 24 hours**
5. **Deploy to production**
6. **Monitor OCR usage analytics**
7. **Gather user feedback**
8. **Plan Phase 3 enhancements**

---

**Happy Testing! 🎉**

Remember: OCR is computationally expensive. Monitor server resources and adjust limits as needed based on your infrastructure.
