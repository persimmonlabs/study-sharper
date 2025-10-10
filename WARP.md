# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Study Sharper is an AI-powered study assistant built with Next.js 14, TypeScript, and Supabase. The application helps students manage notes, assignments, and study sessions with AI-enhanced features like document text extraction, AI chat with notes context, and personalized dashboards.

## Common Commands

### Development
```powershell
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Database Management
The project uses Supabase for backend services. Database schema files are located in the root:
- `supabase-schema.sql` - Complete database schema
- `database-migration.sql` - Migration scripts
- `fix-profile-rls.sql` - Row-level security fixes
- `supabase/migrations/` - Timestamped migrations

To apply schema changes, run SQL scripts directly in the Supabase dashboard SQL Editor at:
https://yicmvsmebwfbvxudyfbg.supabase.co

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with PKCE flow
- **AI Integration**: OpenRouter API (Claude 3.5 Sonnet)
- **Document Processing**: pdfjs-dist, mammoth (DOCX)

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (proxy to backend)
│   │   ├── notes/        # Note CRUD, upload, chat endpoints
│   │   └── folders/      # Folder management
│   ├── auth/             # Authentication pages (login, signup, callback)
│   ├── dashboard/        # Main dashboard
│   ├── notes/            # Notes pages (list, view, edit, new)
│   ├── assignments/      # Assignment management
│   ├── calendar/         # Calendar view
│   ├── study/            # Study session tracking
│   ├── social/           # Social features
│   ├── account/          # User account settings
│   ├── layout.tsx        # Root layout with AuthProvider
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── AuthProvider.tsx  # Authentication context provider
│   ├── ThemeProvider.tsx # Dark mode support
│   ├── HeaderNav.tsx     # Navigation header
│   ├── NoteModal.tsx     # Note viewing/editing modal
│   ├── NotesList.tsx     # Notes list component
│   ├── NotesUpload.tsx   # File upload component
│   └── [context menus and dialogs]
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client + Database types
│   ├── pdfText.ts        # PDF text extraction (pdfjs-dist + OCR fallback)
│   ├── docxText.ts       # DOCX text extraction (mammoth)
│   └── utils.ts          # General utilities
└── types/                 # TypeScript type definitions
    └── [library type definitions]

middleware.ts              # Auth middleware for session management
```

### Key Architectural Patterns

#### 1. Authentication Flow
- Uses `AuthProvider` context wrapper in root layout
- Middleware (`middleware.ts`) maintains session state across page navigations
- `useAuth()` hook provides: `user`, `session`, `profile`, `loading`, `signOut()`, `refresh()`
- Protected routes check auth state and redirect to `/auth/login` with `?next=` parameter

#### 2. Database Layer
- All database types defined in `src/lib/supabase.ts` as TypeScript interfaces
- Direct Supabase client usage in components and API routes
- Row-Level Security (RLS) policies enforce user data isolation
- Tables: `profiles`, `notes`, `note_folders`, `assignments`, `study_sessions`, `audio_transcriptions`

#### 3. API Route Architecture
- Next.js API routes in `src/app/api/` act as proxy layer to backend services
- Backend API URL configured via `BACKEND_API_URL` environment variable
- Production backend: https://study-sharper-backend.onrender.com
- API routes handle:
  - File uploads (`/api/notes/upload`) → forwards to backend `/api/upload`
  - AI chat (`/api/notes/chat`) → OpenRouter API with note context
  - CRUD operations → direct Supabase queries

#### 4. Document Processing Pipeline
- **PDF**: `pdfText.ts` uses pdfjs-dist for native text extraction
  - Fallback to OCR.space API if native extraction fails
  - Configurable via `OCR_SPACE_API_KEY` environment variable
- **DOCX**: `docxText.ts` uses mammoth library for text extraction
- Extracted text stored in `notes.extracted_text` column
- File storage: Supabase Storage bucket `notes-pdfs`

#### 5. AI Chat System
- Route: `src/app/api/notes/chat/route.ts`
- Accepts array of `noteIds` to build context from user's notes
- Builds context from note summaries, content, and extracted text
- Sends to OpenRouter API (Claude 3.5 Sonnet model)
- Returns AI response with source note references
- Requires `OPENROUTER_API_KEY` environment variable

#### 6. State Management
- React Context for auth state (`AuthProvider`)
- Local component state with `useState`
- Real-time updates via Supabase subscriptions (`onAuthStateChange`)
- No external state management library (Redux, Zustand, etc.)

## Environment Variables

Required in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yicmvsmebwfbvxudyfbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]

# Backend API (Python FastAPI service)
BACKEND_API_URL=https://study-sharper-backend.onrender.com  # Production
# BACKEND_API_URL=http://127.0.0.1:8000                      # Local development

# OpenRouter API (for AI chat features)
OPENROUTER_API_KEY=[your key]
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OCR Configuration (Optional - fallback for PDFs without text)
OCR_SPACE_API_KEY=[your key]
OCR_SPACE_API_URL=https://api.ocr.space/parse/image
OCR_SPACE_LANGUAGE=eng
OCR_SPACE_ENGINE=2
```

## Database Schema

### Core Tables
- **profiles**: User profile data (first_name, last_name, avatar_url)
- **notes**: Study notes with file uploads, extracted text, summaries, tags, folder organization
- **note_folders**: Color-coded folders for note organization
- **assignments**: Homework/tests/projects with due dates, status, priority
- **study_sessions**: Time tracking with quality ratings
- **audio_transcriptions**: Audio lecture transcriptions and summaries

All tables have RLS policies restricting access to `user_id = auth.uid()`.

## Important Implementation Details

### File Upload Flow
1. User uploads PDF/DOCX via `NotesUpload` component
2. Frontend sends FormData to `/api/notes/upload`
3. API route proxies to backend at `${BACKEND_API_URL}/api/upload`
4. Backend processes file, extracts text, stores in Supabase Storage
5. Backend creates note record with extracted text in `notes` table
6. Frontend refreshes note list

### AI Chat with Notes
1. User selects notes to chat about
2. Frontend sends messages + noteIds to `/api/notes/chat`
3. API route fetches selected notes from database
4. Builds context string from note content/summaries (max 4 notes, 2000 chars each)
5. Sends to OpenRouter with system prompt including context
6. Returns AI response with source citations

### Authentication Paths
- `/auth/login` - Login form
- `/auth/signup` - Registration form with test data option
- `/auth/callback` - OAuth/magic link callback handler
- `/auth/verify-email` - Email verification page
- `/auth/reset-password` - Password reset form

### Test Credentials
The app includes test mode for demos:
- Email: `test@example.com`
- Password: `Test123!`
- "Load Test Data" button pre-fills signup form

## TypeScript Path Aliases

The project uses `@/*` alias for imports:
```typescript
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Styling Patterns

- Tailwind CSS utility classes throughout
- Dark mode support via `ThemeProvider` component
- Color classes: `dark:bg-gray-900`, `dark:text-gray-100`
- Custom color palette (if defined in `tailwind.config.js`)
- Responsive design with `sm:`, `md:`, `lg:` breakpoints

## Common Development Workflows

### Adding a New Feature
1. Create database schema changes in a new SQL file
2. Update types in `src/lib/supabase.ts` Database interface
3. Create API route if needed in `src/app/api/[feature]/route.ts`
4. Build UI components in `src/components/`
5. Create pages in `src/app/[feature]/`
6. Use `useAuth()` for user context and protected routes

### Debugging Authentication Issues
1. Check browser console for Supabase errors
2. Verify session in `AuthProvider` component state
3. Check middleware is running (should log session refresh)
4. Verify RLS policies in Supabase dashboard
5. Test with `supabase.auth.getSession()` directly

### Working with Supabase
- Client created in `src/lib/supabase.ts`
- Use `createRouteHandlerClient({ cookies })` in API routes
- Use `createClientComponentClient()` in client components
- Database types auto-generated from schema
