# Testing Guide: Phase 3 - Markdown Editor & Note Editing

**Date:** January 18, 2025  
**Purpose:** Comprehensive testing scenarios for note editing functionality

---

## Prerequisites

Before testing, ensure:
- ✅ Migration 007 executed in Supabase
- ✅ Backend server running
- ✅ Frontend development server running
- ✅ Test user account created
- ✅ At least 2-3 test notes uploaded (PDF/DOCX)

---

## Test Scenarios

### 1. Basic Editor Loading

**Objective:** Verify editor loads correctly for completed notes

**Steps:**
1. Log in to Study Sharper
2. Navigate to Notes page
3. Click on a completed note (green checkmark)
4. Click "Edit Note" button in modal
5. Verify you're redirected to `/notes/{id}`

**Expected Results:**
- ✅ Page loads without errors
- ✅ Editor displays with extracted text
- ✅ Top navigation shows note title
- ✅ Character count displays correctly
- ✅ "Last saved" shows timestamp
- ✅ Status shows "All changes saved" (no unsaved changes initially)

**Edge Cases:**
- Empty extracted_text → Editor should show empty state
- Very long text (>500KB) → Should load smoothly
- Special characters in text → Should render correctly

---

### 2. Auto-Save Functionality

**Objective:** Verify auto-save works after 30 seconds

**Steps:**
1. Open a note for editing
2. Make a small change (add a word)
3. Wait exactly 30 seconds without typing
4. Observe status bar

**Expected Results:**
- ✅ Status changes to "Unsaved changes" immediately after typing
- ✅ After 30 seconds, status changes to "Saving..."
- ✅ After save completes, status shows "All changes saved"
- ✅ "Last saved" timestamp updates to "Just now"
- ✅ No errors in console

**Verification:**
1. Refresh the page
2. Verify changes persisted

**Edge Cases:**
- Type, wait 25s, type again → Timer should reset
- Type, wait 30s, type immediately after save → New timer starts
- Multiple rapid changes → Should only save once after 30s

---

### 3. Manual Save (Ctrl+S)

**Objective:** Verify keyboard shortcut saves immediately

**Steps:**
1. Open a note for editing
2. Make a change
3. Press `Ctrl+S` (Windows) or `Cmd+S` (Mac)
4. Observe status bar

**Expected Results:**
- ✅ Status immediately changes to "Saving..."
- ✅ Save completes within 1-2 seconds
- ✅ Status shows "All changes saved"
- ✅ Browser's default save dialog does NOT appear (prevented)
- ✅ Changes persist after refresh

**Edge Cases:**
- Press Ctrl+S with no changes → Should not trigger save
- Press Ctrl+S while auto-save in progress → Should not duplicate save
- Press Ctrl+S repeatedly → Should only save once

---

### 4. Unsaved Changes Warning

**Objective:** Verify browser warns before leaving with unsaved changes

**Steps:**
1. Open a note for editing
2. Make a change (don't wait for auto-save)
3. Try to navigate away (click browser back, close tab, etc.)

**Expected Results:**
- ✅ Browser shows "Leave site?" confirmation dialog
- ✅ Dialog warns about unsaved changes
- ✅ Clicking "Cancel" keeps you on the page
- ✅ Clicking "Leave" navigates away (changes lost)

**Verification:**
1. Make a change
2. Wait for auto-save (30s)
3. Try to navigate away
4. Should NOT show warning (changes saved)

**Edge Cases:**
- No changes made → No warning
- Changes saved → No warning
- Changes made but not saved → Warning shows

---

### 5. Preview Mode

**Objective:** Verify markdown preview renders correctly

**Steps:**
1. Open a note for editing
2. Add markdown formatting:
   ```markdown
   # Heading 1
   ## Heading 2
   **Bold text**
   *Italic text*
   - List item 1
   - List item 2
   [Link](https://example.com)
   ```
3. Click "Preview" button
4. Observe rendered output

**Expected Results:**
- ✅ Headings render with correct sizes
- ✅ Bold and italic formatting applied
- ✅ Lists display with bullets
- ✅ Links are clickable (in preview)
- ✅ "Preview" button changes to "Edit"
- ✅ Clicking "Edit" returns to editor mode

**Edge Cases:**
- Complex markdown (tables, code blocks) → Should render correctly
- Invalid markdown → Should render gracefully
- Very long document → Preview should scroll smoothly

---

### 6. Character Count & Size Limits

**Objective:** Verify size validation and warnings

**Steps:**
1. Open a note for editing
2. Observe character count in header
3. Add text until approaching 1MB limit

**Expected Results:**
- ✅ Character count updates in real-time
- ✅ At 900KB+, orange warning appears showing MB size
- ✅ Warning shows "X.XXMB / 1MB"
- ✅ Attempting to save >1MB shows error

**Test Cases:**

**Small Document (< 100KB):**
- Character count shows (e.g., "12,345 chars")
- No size warning

**Large Document (900KB - 1MB):**
- Character count shows
- Orange warning: "(0.95MB / 1MB)"

**Oversized Document (> 1MB):**
- Try to save
- Error message: "Text too large (1,234,567 bytes). Maximum size is 1MB (1,048,576 bytes)"

---

### 7. Processing Status Handling

**Objective:** Verify editor handles different processing states

**Test 7A: Pending/Processing State**

**Steps:**
1. Upload a new PDF/DOCX file
2. Immediately try to edit it (before processing completes)
3. Navigate to `/notes/{id}`

**Expected Results:**
- ✅ Shows spinner with "Processing Note..." message
- ✅ Shows original filename
- ✅ Editor is NOT shown
- ✅ "Back to Notes" link works

**Test 7B: Failed State**

**Steps:**
1. Find a note with failed processing (or create one with corrupted file)
2. Navigate to `/notes/{id}`

**Expected Results:**
- ✅ Shows error icon
- ✅ Shows "Processing Failed" message
- ✅ Shows error message from backend
- ✅ "Retry Processing" button visible
- ✅ "Delete Note" button visible
- ✅ Editor is NOT shown

**Test 7C: Retry Processing**

**Steps:**
1. On a failed note, click "Retry Processing"
2. Observe behavior

**Expected Results:**
- ✅ Button shows "Retrying..."
- ✅ Button is disabled during retry
- ✅ Page refreshes after retry triggered
- ✅ Status updates to "pending" or "processing"

---

### 8. Delete Functionality

**Objective:** Verify note deletion works from editor page

**Steps:**
1. Open a note for editing
2. Click "Delete" button in top-right
3. Confirm deletion in browser dialog

**Expected Results:**
- ✅ Browser confirmation dialog appears
- ✅ Dialog shows note title
- ✅ Clicking "Cancel" keeps note
- ✅ Clicking "OK" deletes note
- ✅ Redirects to `/notes` page
- ✅ Note no longer appears in list

**Edge Cases:**
- Delete with unsaved changes → Should still delete (confirmation covers this)
- Delete while auto-save in progress → Should cancel save and delete

---

### 9. Edited Manually Badge

**Objective:** Verify badge appears after user edits

**Steps:**
1. Open a freshly processed note (never edited)
2. Verify NO "Manually Edited" badge
3. Make a change and save
4. Verify badge appears

**Expected Results:**
- ✅ Before edit: No badge
- ✅ After edit + save: Blue "Manually Edited" badge appears
- ✅ Badge persists after refresh
- ✅ Badge appears in editor header

**Database Verification:**
1. Check Supabase `notes` table
2. Find the note by ID
3. Verify `edited_manually = true`

---

### 10. Error Handling

**Objective:** Verify graceful error handling

**Test 10A: Network Error During Save**

**Steps:**
1. Open a note for editing
2. Turn off internet connection
3. Make a change
4. Wait for auto-save or press Ctrl+S

**Expected Results:**
- ✅ Status shows "Saving..."
- ✅ After timeout, error message appears
- ✅ Error: "Failed to save note" or network error
- ✅ Changes remain in editor (not lost)
- ✅ User can retry after reconnecting

**Test 10B: Session Expired**

**Steps:**
1. Open a note for editing
2. Wait for session to expire (or manually clear session)
3. Try to save

**Expected Results:**
- ✅ Error message about authentication
- ✅ Redirects to login page (or shows error)
- ✅ After re-login, can return to editing

**Test 10C: Note Not Found**

**Steps:**
1. Navigate to `/notes/invalid-id-12345`

**Expected Results:**
- ✅ Shows "Note not found" error page
- ✅ Error message displayed
- ✅ "Back to Notes" link works
- ✅ No console errors

---

### 11. Markdown Rendering

**Objective:** Verify markdown features work correctly

**Test Content:**
```markdown
# Main Heading

## Subheading

This is **bold** and this is *italic*.

### Lists

- Item 1
- Item 2
  - Nested item
- Item 3

### Numbered Lists

1. First
2. Second
3. Third

### Links

[Google](https://google.com)

### Code

Inline `code` example.

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

### Blockquote

> This is a quote

### Horizontal Rule

---

### Table

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

**Steps:**
1. Paste above content into editor
2. Save
3. Toggle to Preview mode

**Expected Results:**
- ✅ All headings render with correct hierarchy
- ✅ Bold and italic formatting applied
- ✅ Lists display correctly (bullets and numbers)
- ✅ Nested lists indented properly
- ✅ Links are blue and clickable
- ✅ Inline code has gray background
- ✅ Code blocks have syntax highlighting
- ✅ Blockquote has left border
- ✅ Horizontal rule displays
- ✅ Table renders with borders

---

### 12. Performance Testing

**Objective:** Verify editor performs well with large documents

**Test 12A: Large Document Loading**

**Steps:**
1. Create a note with 500KB+ of text
2. Navigate to edit page
3. Measure load time

**Expected Results:**
- ✅ Page loads in < 3 seconds
- ✅ Editor responsive immediately
- ✅ No lag when scrolling
- ✅ Character count updates smoothly

**Test 12B: Typing Performance**

**Steps:**
1. Open large document
2. Type continuously for 30 seconds
3. Observe responsiveness

**Expected Results:**
- ✅ No lag between keypress and character appearing
- ✅ Character count updates smoothly
- ✅ No frame drops
- ✅ Auto-save triggers correctly after 30s

**Test 12C: Save Performance**

**Steps:**
1. Open large document (500KB+)
2. Make a change
3. Trigger save (Ctrl+S or wait 30s)
4. Measure save time

**Expected Results:**
- ✅ Save completes in < 2 seconds
- ✅ No UI freeze during save
- ✅ Status updates smoothly
- ✅ No errors in console

---

### 13. Mobile Responsiveness

**Objective:** Verify editor works on mobile devices

**Steps:**
1. Open editor on mobile device (or use browser dev tools)
2. Test all features

**Expected Results:**
- ✅ Editor fills screen appropriately
- ✅ Toolbar buttons accessible
- ✅ Text input works with mobile keyboard
- ✅ Save button easily tappable
- ✅ Preview mode works
- ✅ Navigation works
- ✅ No horizontal scrolling

**Specific Mobile Tests:**
- Portrait orientation
- Landscape orientation
- Small screens (iPhone SE)
- Large screens (iPad)

---

### 14. Dark Mode

**Objective:** Verify dark mode styling

**Steps:**
1. Enable dark mode in browser/OS
2. Open editor
3. Verify all UI elements

**Expected Results:**
- ✅ Background is dark
- ✅ Text is light colored
- ✅ Editor has dark theme
- ✅ Status bar readable
- ✅ Buttons have appropriate contrast
- ✅ Preview mode uses dark theme
- ✅ No white flashes during transitions

---

### 15. Integration with Existing Features

**Objective:** Verify editing doesn't break existing functionality

**Test 15A: Note List Integration**

**Steps:**
1. Edit a note and save
2. Return to notes list
3. Verify note appears correctly

**Expected Results:**
- ✅ Note shows in list
- ✅ Updated timestamp reflects edit
- ✅ Title unchanged (editing doesn't change title)
- ✅ Folder assignment preserved
- ✅ Tags preserved

**Test 15B: Search Integration**

**Steps:**
1. Edit a note, add unique word
2. Save and return to notes list
3. Search for the unique word

**Expected Results:**
- ✅ Note appears in search results
- ✅ Search finds edited content
- ✅ Search performance unchanged

**Test 15C: Modal Integration**

**Steps:**
1. Edit a note and save
2. Return to notes list
3. Click note to open modal
4. Click "Edit Note" again

**Expected Results:**
- ✅ Modal shows updated content
- ✅ "Edit Note" button works
- ✅ Edited text loads in editor
- ✅ "Manually Edited" badge visible

---

## Regression Testing

### Verify Phase 1 & 2 Still Work

**Upload & Processing:**
- ✅ File upload works
- ✅ Processing status updates
- ✅ Text extraction completes
- ✅ OCR fallback works
- ✅ Error handling works

**Existing Features:**
- ✅ Folders work
- ✅ Tags work
- ✅ Search works
- ✅ Delete works
- ✅ Move to folder works

---

## Bug Tracking Template

When you find a bug, document it:

```markdown
### Bug: [Short Description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920x1080

**Console Errors:**
```
[Paste any console errors]
```

**Screenshots:**
[Attach if relevant]

**Workaround:**
[If any exists]
```

---

## Success Criteria

Phase 3 is considered fully tested when:

- ✅ All 15 test scenarios pass
- ✅ No critical or high severity bugs
- ✅ Performance meets targets (< 3s load, < 2s save)
- ✅ Works on Chrome, Firefox, Safari, Edge
- ✅ Works on mobile devices
- ✅ Dark mode fully functional
- ✅ No regressions in Phase 1 & 2 features
- ✅ Documentation complete and accurate

---

## Performance Benchmarks

**Target Metrics:**

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Page Load | < 2s | < 3s | > 3s |
| Save Time | < 1s | < 2s | > 2s |
| Auto-save Trigger | 30s ±1s | 30s ±2s | > 32s |
| Typing Lag | 0ms | < 50ms | > 100ms |
| Preview Toggle | < 500ms | < 1s | > 1s |

---

## Testing Completion Checklist

- [ ] All 15 test scenarios completed
- [ ] Regression testing passed
- [ ] Performance benchmarks met
- [ ] Mobile testing completed
- [ ] Dark mode testing completed
- [ ] Cross-browser testing completed
- [ ] All bugs documented
- [ ] Critical bugs fixed
- [ ] User acceptance testing completed

---

## Notes for Testers

**Common Issues to Watch For:**
- Text not saving after 30 seconds
- Unsaved changes warning not appearing
- Character count incorrect
- Preview mode not rendering markdown
- Session expiration handling
- Network error recovery

**Tips:**
- Test with real PDF/DOCX files, not just test data
- Try documents with special characters, emojis, etc.
- Test with slow network connections
- Test with browser dev tools open to catch console errors
- Clear browser cache between major test runs

---

## Ready for Production?

After completing all tests and fixing critical bugs, Phase 3 is ready for production deployment!

**Final Verification:**
1. All tests pass ✅
2. No critical bugs ✅
3. Performance acceptable ✅
4. Documentation complete ✅
5. User feedback positive ✅

**Deploy with confidence! 🚀**
