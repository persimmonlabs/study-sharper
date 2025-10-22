# 🧭 STUDY SHARPER MASTER PLAN (v1.1)

Comprehensive architectural and product reference for **Warp Coding Agent** to ensure all future development aligns with the final vision of Study Sharper, minimizing rework and preserving scalability.

---

## 🏗️ OVERVIEW
**Study Sharper** is an AI-powered learning assistant designed to help students organize, study, and retain information more effectively. It integrates smart file processing, note organization, flashcards, quizzes, and personalized AI feedback within a gamified ecosystem.

The app should remain simple in early versions while building the foundation for a scalable, adaptive, and community-driven study platform.

---

## 🔐 AUTHENTICATION & USER MANAGEMENT
- **Sign-up Options:** Google sign-in and standard email/password.
- **Email Verification:** Required before accessing app features.
- **User Data at Signup:** Name, email, password.
- **Initial Quiz:** During onboarding, users provide school, grade, age, major/subjects.
- **Account Recovery:** Email password reset. Optional 2FA and phone verification in future versions.
- **User Roles:** Regular users only. Moderation handled by AI.

---

## 🗂️ NOTE ORGANIZATION & FEATURES
- **Structure:** User-managed folder system.
- **AI Layer:** Embeds all notes for contextual search and study generation.
- **Editor:** Simple, manual-save text editor with bold, italics, underline, font size, and bullet support.
- **Images:** Not supported in V1 (infrastructure ready for future support).
- **Version History:** None in V1.
- **AI Use:** Notes embedded and used to tailor quizzes, flashcards, and study suggestions.

---

## 🧩 FILE PROCESSING SYSTEM
- **Goal:** Convert all user uploads to text for AI use.
- **Supported File Types (V1):** PDF, DOCX, PPTX, JPG/PNG, MP3.
- **Future:** Video, spreadsheets, handwriting recognition.
- **Pipeline:** Simple extraction → OCR → transcription → fallback message if fails.
- **User UX:** Non-blocking background processing with progress indicators.
- **Storage:** Supabase for text + metadata; vector embeddings generated automatically.

---

## 🤝 SOCIAL FEATURES (V2+)
- **Study Groups:** Share/view only, up to 25 members.
- **Peer Help Forum:** Q&A format with badges/tokens for helpful posts.
- **Communication:** Text-only initially; future video/audio chat.
- **Moderation:** AI filters content before posting. Reporting and admin queues.
- **Privacy:** Encrypted private groups, report/ban tools, and AI moderation.

---

## 🔒 DATA PRIVACY & RETENTION
- **Inactive Accounts:** Warning after 6 months, delete after 7.
- **User Deletion:** Full permanent erase on request.
- **Data Export (V2+):** ZIP with notes and metadata.
- **AI Logs:** Only summarized learning patterns stored; raw conversations not saved.
- **Opt-Out:** Users may disable personalization (with warning of reduced AI quality).
- **Compliance:** GDPR, CCPA, FERPA (future). Initial focus on college students.

---

## ⚙️ PERFORMANCE REQUIREMENTS
- **AI Response:** Fast tasks <10s; heavy tasks backgrounded with popup notice.
- **Background Tasks:** File processing and large AI jobs run asynchronously.
- **Concurrency:** Target ~1,000 users in first month.
- **Scalability:** Design for easy scale-up via paid tiers (Supabase, Render, Vercel).

---

## 🧠 LEARNING STYLE PERSONALIZATION
- **Initial Assessment:** Short quiz on signup; editable in account page.
- **Ongoing Adaptation:** AI refines in real time based on user behavior.
- **Tracked Factors:**
  - Subjects/topics
  - Study time habits
  - Quiz difficulty preference
  - Explanation length preference
  - Performance growth
- **Goal:** Dynamic difficulty and tailored study plans.

---

## 📅 ASSIGNMENTS & CALENDAR
- **Assignment Upload:** Manual upload of syllabi or manual entry.
- **Calendar:** Standalone initially; future Google/Outlook sync.
- **AI Scheduling:** Suggests study times using spaced repetition.
- **Features:** Subtasks, milestones, and progress tracking per assignment.

---

## ⚠️ ERROR HANDLING & USER FEEDBACK
- **Error Display:** Simple, friendly, non-technical messages.
- **Feedback System:** In-app bug report form.
- **User Prompts:** Optional periodic feedback at 1 week, 1 month, 6 months, 1 year.
- **Status Page:** Display service uptime and known issues.
- **Support:** FAQ + optional chat support via account tab.
- **Auto-lockout:** Users cannot access broken pages until redeploy.

---

## 🧪 TESTING STRATEGY & QA
- **Approach:** Local dev → deploy to Vercel → live test → iterate.
- **Beta Testing:** To be introduced later (invite-only recommended).
- **QA Priorities for V1:**
  - File uploads
  - Notes & organization
  - AI study tools
  - Dashboard
  - Auth & settings
  - Any unfinished features must display "Coming Soon" lock state.

---

## 🚀 DEPLOYMENT & DEVOPS
- **Environments:** .env for dev; Vercel/Render/Supabase envs for prod.
- **Error Tracking:** Sentry (recommended).
- **Usage Analytics:** Basic analytics for features used.
- **API Cost Monitoring:** Track OpenRouter usage and spending.
- **Backups:** Daily automated database backups; 30-day retention.
- **Updates:** Email or in-app notification for new features.

---

## 🧹 CONTENT MODERATION & SAFETY
- **AI Filtering:** All AI-generated output reviewed before display.
- **If flagged:** Remove content, show message, regenerate.
- **Forum Posts:** Require AI approval before visibility.
- **Auto-flagging:** Profanity, personal info, links.
- **Integrity Notice:** Warn users AI is for studying, not academic submission.

---

## ♿ ACCESSIBILITY & INTERNATIONALIZATION
- **Accessibility:** Add screen reader and color contrast support in future.
- **Languages:** English-only for V1. Plan for multilingual (Spanish, French, German, Portuguese, etc.).
- **AI Language Preference:** Respond in user’s preferred language when available.
- **Device Support:** Desktop primary; full mobile browser compatibility. Native app later.

---

## 🧱 API RATE LIMITING & ABUSE PREVENTION
- **Rate Limits:** 100 requests/minute per user.
- **Abuse Detection:** Monitor rapid actions; temp-ban or alert admin.
- **Cost Caps:** Monthly AI usage limit; pause AI if exceeded.
- **Bot Protection:** Email verification only (no CAPTCHA).

---

## 💾 FILE STORAGE LIMITS & MANAGEMENT
- **Storage Tiers:** Free = 2GB, Premium = 50GB.
- **Warnings:** Shown when near quota.
- **Limit Reached:** Block new uploads with friendly message.
- **User Tools:** View total storage, sort by size, bulk delete.
- **Deletion:** Immediate permanent deletion (no trash bin).

---

## ⏱️ STUDY SESSION TRACKING (V2+)
- **Future Plans:**
  - Manual timers for study sessions.
  - Track time per subject.
  - Link performance to study habits.
  - AI insights: “You study best at 2–4pm.”
  - Optional Pomodoro-style timers.

---

## 🔍 SEARCH FUNCTIONALITY
- **Search Scope:** Unified search across notes, assignments, flashcards.
- **Search Type:** AI-powered semantic search via vector embeddings.
- **Performance:** Up to 2-second delay acceptable.
- **Filters:** By subject, date, or file type (future addition).

---

## 🔔 NOTIFICATION SYSTEM
- **Types:** In-app (bell icon) only for V1.
- **Events:** Progress updates, badges, token rewards.
- **User Control:** Customize notification types and frequency.
- **Future:** Email, push, and digest summaries.

---

## 🚪 ONBOARDING EXPERIENCE
- **Tutorial:** Interactive walkthrough (V2+), skippable.
- **Initial Flow:** Clean slate, no prefilled content.
- **Help Features:**
  - FAQ/help center
  - “What’s this?” tooltips for complex features
  - Later add guided onboarding as final pre-launch polish.

---

## 🃏 FLASHCARD SYSTEM
- **V1 Type:** Traditional front/back.
- **Study Modes:** Flip, shuffle, mark as mastered.
- **Tracking:** AI tracks difficult cards, repeats them more.
- **Organization:** Decks by subject; sharing in future.
- **Generation:** On-demand AI flashcards (saved optionally).
- **Future:** Add audio, images, and interactive modes.

---

## 🧩 QUIZ & EXAM SYSTEM
- **Question Types:** Multiple choice, true/false, short answer, essay.
- **AI Behavior:** Explanations for correct answers, adaptive hints for incorrect ones.
- **Grading:** Auto-grade via embeddings/RAG for free responses.
- **Difficulty:** Mix of easy–hard; user or AI controlled.
- **Quizzes vs Exams:** Quizzes = short & topic-specific; Exams = longer, broader, timed.
- **Results:** Immediate results, detailed topic breakdown, saved for review.

---

## 🧠 VECTOR DATABASE & RAG IMPLEMENTATION
- **Embedding:** Auto-generate embeddings when text extracted; re-embed on edits.
- **Chunking:** Split long docs into manageable segments.
- **Retrieval:** Top relevant sections via cosine similarity.
- **Transparency:** Show context sources subtly (non-intrusive).
- **Performance:** Embed on upload, background jobs for large files.
- **Database:** Supabase pgvector in same Postgres instance.

---

## 🧱 CODE ARCHITECTURE & FILE STRUCTURE
- **Frontend:** Next.js (App Router). Organize by feature: `/notes`, `/study`, `/social`, `/auth`.
- **Backend:** FastAPI with modular route files (`notes.py`, `ai.py`, `auth.py`).
- **Service Layers:** Business logic separated from routes.
- **Shared Types:** TypeScript interfaces synced via shared schema.
- **Standards:** Follow best practices; consistent naming and inline comments.

---

## 🔌 THIRD-PARTY INTEGRATIONS
- **Email:** Supabase built-in or Resend for production reliability.
- **Analytics:** Plausible or Posthog (privacy-friendly alternatives to GA).
- **Payments:** Stripe for premium tiers (V2+).
- **Error Tracking:** Sentry for backend/frontend monitoring.
- **OCR:** Google Cloud Vision (primary); fallback to n8n or AWS Textract.

---

## 🎯 MVP COMPLETION REQUIREMENTS
For V1 launch, the following **must fully function**:
1. File upload & text extraction
2. Note creation & folder organization
3. Flashcard & quiz generation
4. Dashboard with accurate data
5. Authentication (Google & email/password)
6. Account settings management
7. AI integration pipeline (embeddings + RAG)
8. User-friendly error handling
9. Basic in-app notifications
10. “Coming Soon” lock for unfinished features

---

## 🧩 FUTURE EXPANSIONS
- Real-time collaborative study groups
- Mobile app version
- Spaced repetition engine
- AI study coach with memory retention analytics
- Institutional integrations (school logins, syllabus parsing)
- Multi-language support
- Accessibility certification (WCAG compliance)
- Premium tier with advanced AI models and analytics

---

## ✅ SUMMARY
This document defines the **Study Sharper v1.1 architecture and roadmap**.  
It ensures all development within Warp remains:
- **Aligned** with the long-term vision.
- **Modular** for scalability.
- **Consistent** across frontend, backend, and AI workflows.
- **User-first** — prioritizing clarity, simplicity, and educational value.

**Next Step:** Warp coding agent should reference this plan before any code change or feature addition to maintain long-term coherence and reduce future refactors.

