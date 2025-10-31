# Phase 2 RAG Chat - Testing Guide

## Pre-Testing Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Database migrations applied in Supabase
- [ ] File chunks exist for at least one file
- [ ] User is authenticated

## Test Scenarios

### Test 1: Basic Chat Flow

**Objective**: Verify basic chat functionality

**Steps**:
1. Navigate to Files page
2. Select a file that has been processed (status: completed)
3. Open chat interface (click "Chat with File" button)
4. Type: "What is this document about?"
5. Press Enter or click Send

**Expected Results**:
- ✅ Message appears in chat
- ✅ Loading spinner shows while processing
- ✅ Assistant response appears within 5 seconds
- ✅ Response is relevant to file content
- ✅ No error messages

**Verification**:
```bash
# Check browser console for errors
# Check network tab for successful POST to /api/chat/with-files
# Verify response includes session_id and sources
```

---

### Test 2: Source Citations

**Objective**: Verify sources are displayed correctly

**Steps**:
1. Send a message (from Test 1)
2. Look at the assistant response
3. Check the "Sources:" section below the response

**Expected Results**:
- ✅ Sources section appears
- ✅ Shows file title
- ✅ Shows relevant excerpt from file
- ✅ Shows similarity score (0-100%)
- ✅ Multiple sources if available

**Verification**:
```bash
# Check that similarity scores are between 0 and 1
# Verify excerpts are from the actual file
# Confirm file titles match uploaded files
```

---

### Test 3: Session Persistence

**Objective**: Verify conversation history is maintained

**Steps**:
1. Send first message: "What are the main topics?"
2. Wait for response
3. Send second message: "Tell me more about the first topic"
4. Verify the assistant references the previous context

**Expected Results**:
- ✅ Session ID remains the same
- ✅ Second response references first message context
- ✅ Conversation flows naturally
- ✅ Both messages appear in chat history

**Verification**:
```bash
# Check that session_id is same in both responses
# Verify conversation_messages table has both messages
# Check that assistant response uses conversation history
```

---

### Test 4: Multiple Files

**Objective**: Verify chat works with multiple files

**Steps**:
1. Upload 2-3 different files
2. Wait for all to complete processing
3. Select multiple files (if UI supports)
4. Send message: "Compare the topics across files"

**Expected Results**:
- ✅ Chat retrieves chunks from all files
- ✅ Sources show different file titles
- ✅ Response compares content from multiple files

**Verification**:
```bash
# Check that file_ids array includes all selected files
# Verify sources include chunks from different files
# Confirm response mentions multiple files
```

---

### Test 5: Error Handling

**Objective**: Verify error handling works correctly

**Steps**:

**5a - No file selected**:
1. Open chat without selecting a file
2. Try to send a message

**Expected**: Error message: "Please select a file to chat with"

**5b - Empty message**:
1. Select a file
2. Try to send empty message

**Expected**: Send button is disabled

**5c - Network error**:
1. Select a file
2. Disable network (DevTools)
3. Send a message
4. Re-enable network

**Expected**: Error message displayed, can retry

**5d - Invalid session**:
1. Get a session_id from chat
2. Manually delete the session in Supabase
3. Try to send another message with that session_id

**Expected**: New session created, chat continues

---

### Test 6: Dark Mode

**Objective**: Verify UI looks good in dark mode

**Steps**:
1. Toggle dark mode
2. Open chat interface
3. Send a message
4. Check all elements

**Expected Results**:
- ✅ Text is readable
- ✅ Buttons are visible
- ✅ Messages have good contrast
- ✅ Sources are readable
- ✅ No white flashes

---

### Test 7: Performance

**Objective**: Verify response times are acceptable

**Steps**:
1. Open DevTools Network tab
2. Send a message
3. Note the time to first response

**Expected Results**:
- ✅ POST /api/chat/with-files: < 10 seconds
- ✅ Typical response: 3-5 seconds
- ✅ No timeouts

**Measurements**:
```
Vector search: ~100ms
Response generation: ~2-5s
Total: ~3-6s
```

---

### Test 8: Long Conversations

**Objective**: Verify chat works with many messages

**Steps**:
1. Send 10+ messages in a conversation
2. Scroll through chat history
3. Send another message

**Expected Results**:
- ✅ All messages visible
- ✅ Scrolling is smooth
- ✅ New messages appear correctly
- ✅ No performance degradation

---

### Test 9: Special Characters

**Objective**: Verify special characters are handled

**Steps**:
1. Send message with: emojis, quotes, code, special symbols
2. Example: "What about 'quoted text' and code: `print('hello')`?"

**Expected Results**:
- ✅ Message sends successfully
- ✅ Special characters preserved
- ✅ Response is correct

---

### Test 10: Session Recovery

**Objective**: Verify sessions can be resumed

**Steps**:
1. Send a message and note the session_id
2. Refresh the page
3. Open the same file
4. Verify chat history is still there

**Expected Results**:
- ✅ Chat history persists
- ✅ Session ID is the same
- ✅ Can continue conversation

---

## Backend Testing

### Test Backend Endpoints Directly

**Using curl**:

```bash
# Get auth token
TOKEN="eyJ0eXAi..." # From frontend console

# Test 1: Send message (create session)
curl -X POST http://localhost:8000/api/chat/with-files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is this about?",
    "file_ids": ["file-uuid"]
  }' | jq .

# Expected: session_id, message_id, response, sources

# Test 2: Send message (resume session)
SESSION_ID="session-uuid-from-above"
curl -X POST http://localhost:8000/api/chat/with-files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"message\": \"Tell me more\",
    \"file_ids\": [\"file-uuid\"]
  }" | jq .

# Expected: same session_id, new message_id, new response

# Test 3: Get session
curl -X GET http://localhost:8000/api/chat/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: session object and all messages

# Test 4: List sessions
curl -X GET http://localhost:8000/api/chat/sessions \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: array of sessions

# Test 5: Delete session
curl -X DELETE http://localhost:8000/api/chat/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: {success: true, message: "Session deleted"}
```

---

## Database Verification

### Check Data in Supabase

```sql
-- Check sessions
SELECT id, user_id, session_type, started_at, last_activity
FROM conversation_sessions
ORDER BY last_activity DESC
LIMIT 5;

-- Check messages
SELECT id, session_id, role, content, created_at
FROM conversation_messages
WHERE session_id = 'session-uuid'
ORDER BY created_at;

-- Check file chunks
SELECT id, file_id, chunk_index, LENGTH(content) as content_length
FROM file_chunks
WHERE file_id = 'file-uuid'
LIMIT 5;

-- Verify RLS policies
SELECT * FROM conversation_sessions
WHERE user_id = auth.uid();
```

---

## Performance Benchmarks

### Expected Metrics

| Operation | Expected Time | Acceptable Range |
|-----------|---|---|
| Vector search (5 chunks) | 100ms | < 500ms |
| Response generation | 2-5s | < 10s |
| Total request | 3-6s | < 10s |
| Message save | 50ms | < 200ms |
| Session create | 50ms | < 200ms |

### Load Testing

```bash
# Send 10 messages rapidly
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/chat/with-files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": \"$SESSION_ID\",
      \"message\": \"Message $i\",
      \"file_ids\": [\"file-uuid\"]
    }" &
done
wait
```

---

## Troubleshooting

### Issue: "Not authenticated"
- **Cause**: Token expired or missing
- **Fix**: Refresh page, log in again
- **Check**: Browser console for auth errors

### Issue: "Session not found"
- **Cause**: Session deleted or wrong session_id
- **Fix**: Create new session (don't provide session_id)
- **Check**: Supabase conversation_sessions table

### Issue: "No relevant notes found"
- **Cause**: File chunks not created or no matches
- **Fix**: Verify file was processed, check file_chunks table
- **Check**: `SELECT COUNT(*) FROM file_chunks WHERE file_id = 'xxx'`

### Issue: Slow responses (> 10s)
- **Cause**: Large number of chunks, slow LLM
- **Fix**: Reduce top_k from 5 to 3
- **Check**: Backend logs for timing

### Issue: Sources don't match query
- **Cause**: Vector search returning low-quality matches
- **Fix**: Increase similarity threshold
- **Check**: Similarity scores in response

### Issue: Chat history not persisting
- **Cause**: Session not saved or RLS policy blocking
- **Fix**: Check RLS policies in Supabase
- **Check**: `SELECT * FROM conversation_messages WHERE session_id = 'xxx'`

---

## Sign-Off Checklist

- [ ] All 10 test scenarios pass
- [ ] No console errors
- [ ] No network errors
- [ ] Performance acceptable (< 10s)
- [ ] Dark mode works
- [ ] Error handling works
- [ ] Database data looks correct
- [ ] Backend endpoints respond correctly
- [ ] Session persistence works
- [ ] Sources are accurate

---

## Deployment Sign-Off

Once all tests pass:

1. **Backend**: ✅ Render deployment successful
2. **Frontend**: ✅ Vercel deployment successful
3. **Database**: ✅ Migrations applied
4. **Testing**: ✅ All scenarios pass
5. **Performance**: ✅ Acceptable latency

**Ready for Production**: YES ✅
