# Phase 2: RAG Chat Implementation - COMPLETE

## Overview

Phase 2 implements **Chat with Notes (RAG)** - allowing users to have conversations with their uploaded files using Retrieval-Augmented Generation. The system retrieves relevant file chunks, maintains conversation history, and provides source citations.

## Architecture

```
User Query
    ↓
FileChatInterface (Frontend)
    ↓
POST /api/chat/with-files
    ↓
file_chat.py (Backend)
    ├─ Create/Resume Session
    ├─ Save User Message
    ├─ Retrieve Relevant Chunks (RAG)
    ├─ Generate Response (Claude 3.5 Sonnet)
    ├─ Save Assistant Message
    └─ Return Response + Sources
    ↓
FileChatInterface (Display)
    ├─ Show Message
    ├─ Display Sources with Similarity
    └─ Maintain Session for Continuity
```

## Components Implemented

### 1. Backend: Enhanced file_chat.py

**File**: `app/api/file_chat.py`

**Endpoints**:

#### POST /api/chat/with-files
- **Purpose**: Send message and get RAG response
- **Request**:
  ```json
  {
    "session_id": "optional-uuid",
    "message": "What are the key points?",
    "file_ids": ["file-uuid-1", "file-uuid-2"]
  }
  ```
- **Response**:
  ```json
  {
    "session_id": "uuid",
    "message_id": "uuid",
    "response": "The key points are...",
    "sources": [
      {
        "file_id": "uuid",
        "file_title": "document.pdf",
        "chunk_id": "uuid",
        "similarity": 0.92,
        "text": "Relevant excerpt..."
      }
    ]
  }
  ```

**Features**:
- ✅ Auto-creates session if not provided
- ✅ Saves user message to database
- ✅ Retrieves relevant chunks using vector search
- ✅ Generates response with Claude 3.5 Sonnet
- ✅ Saves assistant response with sources
- ✅ Updates session last_activity timestamp

#### GET /api/chat/sessions/{session_id}
- Retrieve session with all messages
- Verify user ownership

#### GET /api/chat/sessions
- List user's conversation sessions
- Paginated (limit, offset)
- Ordered by last_activity

#### DELETE /api/chat/sessions/{session_id}
- Delete session and all messages
- Verify user ownership

### 2. Backend: RAG Service

**File**: `app/services/rag_service.py` (NEW)

**Class**: `RAGService`

**Methods**:

```python
# Session Management
async def create_session(user_id, session_type="chat", file_ids=None) -> str
async def get_session(session_id, user_id) -> Dict
async def delete_session(session_id, user_id) -> bool
async def list_sessions(user_id, limit=20, offset=0) -> Dict

# Message Management
async def save_message(session_id, role, content, metadata=None) -> str
async def get_conversation_history(session_id, limit=10) -> List

# RAG Operations
async def retrieve_context(user_id, query, file_ids=None, top_k=5) -> Dict
async def generate_response(query, system_message, conversation_history=None) -> str

# Complete Flow
async def chat_with_files(user_id, query, session_id=None, file_ids=None) -> Dict
```

**Features**:
- ✅ Consolidates RAG logic
- ✅ Manages conversation sessions
- ✅ Maintains message history
- ✅ Handles context retrieval
- ✅ Generates responses with history

### 3. Frontend: FileChatInterface Component

**File**: `src/components/chat/FileChatInterface.tsx` (NEW)

**Props**:
```typescript
interface FileChatInterfaceProps {
  selectedFile?: FileItem | null
  selectedFileIds?: string[]
  onClose?: () => void
}
```

**Features**:
- ✅ Message list with user/assistant distinction
- ✅ Input textarea with send button
- ✅ File context display
- ✅ Source citations with similarity scores
- ✅ Session persistence
- ✅ Error handling
- ✅ Loading states
- ✅ Dark mode support
- ✅ Keyboard shortcuts (Shift+Enter for newline, Enter to send)

**UI Elements**:
- Header with title and close button
- File context badge
- Message list with scrolling
- Sources display with file title, excerpt, and similarity
- Input area with textarea and send button
- Error messages with alert icon

### 4. Frontend: Chat API Client

**File**: `src/lib/api/chatApi.ts` (NEW)

**Functions**:
```typescript
chatWithFiles(request: ChatRequest) -> Promise<ChatResponse>
getSession(sessionId: string) -> Promise<{session, messages}>
listSessions(limit, offset) -> Promise<{sessions, total}>
deleteSession(sessionId: string) -> Promise<{success, message}>
```

**Features**:
- ✅ Automatic auth token handling
- ✅ Error handling with descriptive messages
- ✅ Type-safe interfaces
- ✅ Pagination support

## Database Schema

### conversation_sessions
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
session_type TEXT ('chat', 'flashcard', 'quiz', 'study_plan')
context_data JSONB (file_ids, created_at, etc.)
started_at TIMESTAMPTZ
last_activity TIMESTAMPTZ
ended_at TIMESTAMPTZ (nullable)
```

### conversation_messages
```sql
id UUID PRIMARY KEY
session_id UUID REFERENCES conversation_sessions(id)
role TEXT ('user', 'assistant', 'system')
content TEXT
metadata JSONB (file_ids, sources, timestamp)
created_at TIMESTAMPTZ
```

### file_chunks (from Phase 1)
```sql
id UUID PRIMARY KEY
file_id UUID REFERENCES files(id)
user_id UUID REFERENCES auth.users(id)
chunk_index INTEGER
content TEXT
embedding vector(384)
created_at TIMESTAMPTZ
```

## Data Flow

### 1. User Sends Message
```
Frontend: User types "What are the key points?"
    ↓
Frontend: Calls chatWithFiles({
  session_id: null (or existing),
  message: "What are the key points?",
  file_ids: ["file-uuid"]
})
    ↓
POST /api/chat/with-files
```

### 2. Backend Processes
```
Backend: Create/Resume Session
    ↓
Backend: Save User Message to DB
    ↓
Backend: Retrieve Relevant Chunks
    - Generate embedding for query
    - Search file_chunks table
    - Get top 5 most similar chunks
    ↓
Backend: Get Conversation History
    - Fetch last 5 messages from session
    ↓
Backend: Generate Response
    - Build system prompt with chunks
    - Add conversation history
    - Call Claude 3.5 Sonnet
    ↓
Backend: Save Assistant Message
    - Store response in DB
    - Include sources metadata
    ↓
Return Response + Sources
```

### 3. Frontend Displays
```
Frontend: Receive Response
    ↓
Frontend: Add Assistant Message to List
    ↓
Frontend: Display Message with Sources
    - Show response text
    - Show source citations
    - Display similarity scores
    ↓
Frontend: Update Session ID
    - Store for future messages
```

## Integration Steps

### Step 1: Verify Database Migrations
Run these migrations in Supabase SQL Editor:

```sql
-- Migration 018: file_chunks table
-- Migration: phase_2_context_tables.sql
```

Verify tables exist:
- ✅ `file_chunks` - with embeddings
- ✅ `conversation_sessions` - with RLS
- ✅ `conversation_messages` - with RLS

### Step 2: Deploy Backend

1. Commit changes:
   ```bash
   git add app/api/file_chat.py app/services/rag_service.py
   git commit -m "Phase 2: Add RAG chat with session management"
   ```

2. Push to GitHub:
   ```bash
   git push origin main
   ```

3. Render auto-deploys (2-5 minutes)

### Step 3: Deploy Frontend

1. Install dependencies (if needed):
   ```bash
   npm install
   ```

2. Commit changes:
   ```bash
   git add src/components/chat/ src/lib/api/chatApi.ts
   git commit -m "Phase 2: Add FileChatInterface component"
   ```

3. Push to GitHub:
   ```bash
   git push origin main
   ```

4. Vercel auto-deploys

### Step 4: Integration into FileViewer

To integrate chat into the file viewer (recommended UX):

**File**: `src/components/files/FileViewer.tsx`

```typescript
import { FileChatInterface } from '@/components/chat/FileChatInterface'

export function FileViewer({ file, onEdit }: FileViewerProps) {
  const [showChat, setShowChat] = useState(false)

  return (
    <div className="flex gap-4">
      {/* File Content */}
      <div className="flex-1">
        {/* existing viewer code */}
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="w-96 border-l">
          <FileChatInterface
            selectedFile={file}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Toggle Button */}
      <button onClick={() => setShowChat(!showChat)}>
        {showChat ? 'Hide Chat' : 'Chat with File'}
      </button>
    </div>
  )
}
```

## Testing

### Manual Testing

1. **Upload a file**:
   - Go to Files page
   - Upload a PDF or TXT file
   - Wait for processing to complete

2. **Open chat**:
   - Click on file to view
   - Click "Chat with File" button
   - Chat sidebar opens

3. **Send message**:
   - Type: "What are the main topics?"
   - Press Enter or click Send
   - Wait for response

4. **Verify sources**:
   - Check that response includes sources
   - Verify similarity scores (0-1)
   - Click on source to see excerpt

5. **Test session persistence**:
   - Send another message
   - Verify session_id stays the same
   - Check that conversation history is maintained

### API Testing

**Using curl**:
```bash
# Get token from frontend console
TOKEN="eyJ0eXAi..."

# Send message
curl -X POST http://localhost:8000/api/chat/with-files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key points?",
    "file_ids": ["file-uuid"]
  }'

# Get session
curl -X GET http://localhost:8000/api/chat/sessions/session-uuid \
  -H "Authorization: Bearer $TOKEN"

# List sessions
curl -X GET http://localhost:8000/api/chat/sessions \
  -H "Authorization: Bearer $TOKEN"
```

## Performance Considerations

### Vector Search
- **Top K**: 5 chunks retrieved per query
- **Similarity Threshold**: 0.5 (configurable)
- **Index Type**: ivfflat (approximate nearest neighbor)
- **Performance**: ~100ms for search

### Response Generation
- **Model**: Claude 3.5 Sonnet
- **Context Window**: Last 5 messages + system prompt + chunks
- **Latency**: ~2-5 seconds

### Database
- **Session Storage**: Minimal (metadata only)
- **Message Storage**: ~1KB per message
- **Indexes**: On session_id, user_id, created_at

## Error Handling

### Frontend Errors
- ✅ Not authenticated → Show login prompt
- ✅ No file selected → Show warning
- ✅ Network error → Show error message
- ✅ Empty message → Disable send button

### Backend Errors
- ✅ Session not found → 404
- ✅ Unauthorized access → 403
- ✅ Invalid file_ids → 400
- ✅ RAG retrieval failed → Return empty context
- ✅ Response generation failed → 500 with error message

## Future Enhancements

### Phase 2.1: Session Management UI
- List previous conversations
- Resume sessions
- Delete sessions
- Export conversations

### Phase 2.2: Advanced RAG
- Multi-file context
- Semantic search with filters
- Custom system prompts
- Temperature/top_p controls

### Phase 2.3: Streaming Responses
- Stream response as it's generated
- Real-time source highlighting
- Progressive rendering

### Phase 2.4: Chat History
- Save chat history to files
- Export as PDF
- Share conversations

## Files Created/Modified

### Created
- ✅ `app/services/rag_service.py` - RAG service class
- ✅ `src/components/chat/FileChatInterface.tsx` - Chat UI component
- ✅ `src/lib/api/chatApi.ts` - Chat API client

### Modified
- ✅ `app/api/file_chat.py` - Enhanced with session management

### Database (Already Exists)
- ✅ `conversation_sessions` table
- ✅ `conversation_messages` table
- ✅ `file_chunks` table with embeddings

## Status

✅ **Phase 2 RAG Chat Implementation - COMPLETE**

### Completed
- ✅ Backend session management endpoints
- ✅ RAG service consolidation
- ✅ Frontend chat component
- ✅ API client with auth
- ✅ Message persistence
- ✅ Source citations
- ✅ Error handling
- ✅ Dark mode support

### Ready for
- ✅ Integration into FileViewer
- ✅ End-to-end testing
- ✅ Deployment to production

### Next Steps
1. Integrate FileChatInterface into FileViewer
2. Test end-to-end workflow
3. Deploy to production
4. Monitor performance
5. Gather user feedback

## Deployment Checklist

- [ ] Run database migrations in Supabase
- [ ] Commit backend changes
- [ ] Commit frontend changes
- [ ] Push to GitHub
- [ ] Verify Render deployment (2-5 min)
- [ ] Verify Vercel deployment (1-3 min)
- [ ] Test upload → chat workflow
- [ ] Test session persistence
- [ ] Test source citations
- [ ] Monitor error logs
