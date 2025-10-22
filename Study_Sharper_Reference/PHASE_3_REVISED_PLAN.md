# 🎯 PHASE 3 REVISED PLAN - AI-FIRST APPROACH

**Date:** October 13, 2025  
**Status:** Phase 3A Complete, Starting Phase 3B  
**Priority Shift:** Authentication Polish → AI/RAG Infrastructure

---

## 📊 PHASE 3A: GOOGLE OAUTH - COMPLETE ✅

### What Was Accomplished:
1. ✅ Google OAuth provider configured in Supabase
2. ✅ Google sign-in/sign-up buttons added to login and signup pages
3. ✅ Handled implicit grant OAuth flow (tokens in URL fragment)
4. ✅ Manual token extraction and session creation using `setSession()`
5. ✅ Users successfully redirected to dashboard after Google auth
6. ✅ Profile creation logic added (though currently not working - see known issues)

### Known Issues (Deferred to Phase 5):
- ❌ **Google OAuth name extraction not working**
  - Root cause: Server action requires server-side cookies, can't be called from client component
  - Impact: Welcome message shows "Welcome, !" instead of "Welcome, John!"
  - Workaround: Users can add name in account settings
  - Fix: Create API endpoint (not server action) for profile creation

---

## 🚀 REVISED PHASE 3 PRIORITIES

### **Old Plan** (Authentication-focused):
~~1. Complete email verification~~  
~~2. Complete password reset~~  
~~3. Test Google OAuth~~  
~~4. Assignment management~~  
~~5. Study session tracking~~  

### **New Plan** (AI-focused):
1. **Phase 3B:** AI/RAG Infrastructure ⭐ **NEXT**
2. **Phase 3C:** Core AI Features (Flashcards, Quizzes, Exams)
3. **Phase 3D-F:** Secondary features (lower priority)
4. **Phase 5:** UX Polish (fix auth issues)

---

## 🎯 PHASE 3B: AI/RAG INFRASTRUCTURE (STARTING NOW)

### Goal:
Establish reliable AI pipeline with OpenRouter, vector database, and RAG for personalized study assistance.

### Why This Matters:
- **Core Value Prop:** AI-powered study tools are what make Study Sharper unique
- **User Retention:** Students stay for AI features, not for pretty auth flows
- **MVP Viability:** Without AI, it's just another note-taking app
- **Technical Foundation:** Other features depend on this working first

---

## 📋 PHASE 3B DETAILED BREAKDOWN

### **Step 1: OpenRouter API Integration** (Day 1)

**Tasks:**
1. Locate OpenRouter API credentials
   - Check backend `.env` file for `OPENROUTER_API_KEY`
   - Verify key is active and has credits
2. Test basic API connectivity
   - Make simple completion request to OpenRouter
   - Test with GPT-4, Claude, and other models
   - Verify response format and latency
3. Implement error handling
   - Handle API failures gracefully
   - Add retry logic with exponential backoff
   - Handle rate limiting
4. Document model selection
   - Which models work best for flashcards?
   - Which for quiz generation?
   - Which for grading?

**Success Metrics:**
- ✅ Can make successful API calls to OpenRouter
- ✅ Errors handled gracefully
- ✅ Response time < 10 seconds for simple queries
- ✅ Multiple models tested and documented

---

### **Step 2: Vector Database Verification** (Day 1-2)

**Tasks:**
1. Verify Supabase pgvector extension
   - Check if pgvector is enabled in Supabase
   - Verify `note_embeddings` table exists and is correct
   - Check RLS policies on embedding tables
2. Test embedding storage
   - Generate sample embeddings
   - Store in `note_embeddings` table
   - Verify data persists correctly
3. Test embedding retrieval
   - Query embeddings by note_id
   - Test similarity search
   - Verify performance with 100+ embeddings
4. Add indexes
   - Create HNSW or IVFFlat index for fast similarity search
   - Test query performance before/after index

**Success Metrics:**
- ✅ pgvector extension enabled
- ✅ Can store and retrieve embeddings
- ✅ Similarity search returns relevant results
- ✅ Query time < 1 second for 1000+ embeddings

---

### **Step 3: RAG Pipeline Implementation** (Day 2-3)

**Tasks:**
1. Text chunking implementation
   - Split long notes into 500-1000 token chunks
   - Preserve context between chunks
   - Handle code blocks, lists, headings properly
2. Embedding generation endpoint
   - Create `/api/embeddings/generate` endpoint
   - Accept note text, return embedding vector
   - Use OpenRouter or dedicated embedding API
   - Queue large batch jobs
3. Semantic search function
   - Create `/api/embeddings/search` endpoint
   - Accept query text, return relevant note chunks
   - Use cosine similarity threshold (e.g., > 0.7)
   - Return top K results (e.g., K=5)
4. Context retrieval for AI
   - Build context from retrieved chunks
   - Manage token limits (stay under model's context window)
   - Format context for LLM consumption
   - Handle case when no relevant context found

**Success Metrics:**
- ✅ Long documents chunked intelligently
- ✅ Embeddings generated for all note chunks
- ✅ Search returns relevant results for queries
- ✅ Context assembly works within token limits

---

### **Step 4: End-to-End AI Query Pipeline** (Day 3-4)

**Tasks:**
1. Implement full query flow:
   ```
   User Query 
   → Generate query embedding
   → Search vector DB for relevant notes
   → Retrieve note chunks
   → Build context
   → Send to LLM with prompt
   → Stream response back
   → Display to user
   ```
2. Test with various query types:
   - "Explain photosynthesis from my biology notes"
   - "Generate 5 flashcards about World War 2"
   - "Quiz me on calculus derivatives"
3. Add source attribution
   - Show which notes were used for the answer
   - Link back to original notes
4. Implement response streaming
   - Stream LLM response token-by-token
   - Show "thinking" state
   - Allow user to stop generation
5. Conversation history
   - Store recent chat messages
   - Include in context for follow-up questions
   - Limit to last N messages to save tokens

**Success Metrics:**
- ✅ User can ask questions about their notes
- ✅ Responses are accurate and relevant
- ✅ Sources are attributed correctly
- ✅ Streaming works smoothly
- ✅ Follow-up questions work contextually

---

## 🎯 PHASE 3C: CORE AI STUDY FEATURES (Week 2-3)

### Features to Build:
1. **AI-Generated Flashcards**
   - Button: "Generate Flashcards" on note page
   - Options: Number of cards (5, 10, 20)
   - AI extracts key concepts and creates Q&A pairs
   - Save to database, display in flip-card UI
   - Track mastery level

2. **AI-Generated Quizzes**
   - Button: "Generate Quiz" with difficulty selector
   - Question types: Multiple choice, True/False, Short answer
   - AI grades short answers using embeddings
   - Show immediate feedback with explanations
   - Track performance over time

3. **AI-Generated Practice Exams**
   - Comprehensive exams across multiple topics
   - Timed mode
   - Mix of question types
   - Full auto-grading
   - Detailed performance report
   - Identify knowledge gaps

---

## ⚠️ KNOWN ISSUES (TO FIX IN PHASE 5)

### Authentication Issues:
1. **Google OAuth profile names not saving**
   - Severity: Medium
   - User impact: Cosmetic (welcome message looks weird)
   - Workaround: Users can add name in settings
   - Fix: Create API endpoint for profile creation

2. **Email verification not fully tested**
   - Severity: Low
   - User impact: May have edge cases
   - Status: Works in basic cases, needs comprehensive testing

3. **Password reset not fully tested**
   - Severity: Low
   - User impact: May have edge cases
   - Status: Works in basic cases, needs comprehensive testing

4. **Loading states could be better**
   - Severity: Low
   - User impact: Minor UX issue
   - Status: Basic spinners exist, could add skeletons

### Priority:
All auth issues are **deferred to Phase 5** because:
- They don't block core functionality
- Users can still sign up and use the app
- AI features are more critical for MVP
- Better to have working AI with imperfect auth than perfect auth with no AI

---

## 📊 REVISED SUCCESS CRITERIA

### Phase 3 Complete When:
- ✅ OpenRouter API integrated and working
- ✅ Vector database operational
- ✅ RAG pipeline returns relevant context
- ✅ Users can generate flashcards from notes
- ✅ Users can generate quizzes from notes
- ✅ Users can take practice exams
- ✅ Auto-grading works accurately
- ✅ Performance tracking shows progress

### Can Skip for Now:
- ⏸️ Perfect authentication UX
- ⏸️ Assignment management features
- ⏸️ Study session tracking
- ⏸️ Advanced dashboard analytics

---

## 🚀 NEXT IMMEDIATE STEPS

1. **Check OpenRouter credentials** in backend `.env`
2. **Make test API call** to verify connectivity
3. **Check Supabase pgvector** extension status
4. **Review existing backend code** for AI/embeddings
5. **Plan API endpoint structure** for AI features

---

*Document created: October 13, 2025*  
*Phase 3A (Google OAuth): Complete ✅*  
*Phase 3B (AI/RAG): Starting now 🚀*
