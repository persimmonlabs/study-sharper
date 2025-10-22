# 🚀 Production Deployment Guide - Flashcard Feature

## Overview
This guide will help you deploy the flashcard feature to production (Vercel + Render).

---

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Supabase project with flashcard tables created
- [ ] OpenRouter API key with credits
- [ ] Render account (for backend)
- [ ] Vercel account (for frontend)
- [ ] Git repository pushed to GitHub

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Run Flashcard Schema

Go to your Supabase project → SQL Editor → New Query

**Paste and run this SQL:**

```sql
-- Create flashcard_sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    total_cards INTEGER DEFAULT 0,
    mastered_cards INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 3),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_created_at ON flashcard_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON flashcards(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_mastery_level ON flashcards(mastery_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_at);

-- RLS Policies for flashcard_sets
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own flashcard sets" ON flashcard_sets;
CREATE POLICY "Users can view their own flashcard sets"
    ON flashcard_sets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own flashcard sets" ON flashcard_sets;
CREATE POLICY "Users can create their own flashcard sets"
    ON flashcard_sets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own flashcard sets" ON flashcard_sets;
CREATE POLICY "Users can update their own flashcard sets"
    ON flashcard_sets FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own flashcard sets" ON flashcard_sets;
CREATE POLICY "Users can delete their own flashcard sets"
    ON flashcard_sets FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for flashcards
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view flashcards in their sets" ON flashcards;
CREATE POLICY "Users can view flashcards in their sets"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets
            WHERE flashcard_sets.id = flashcards.set_id
            AND flashcard_sets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create flashcards in their sets" ON flashcards;
CREATE POLICY "Users can create flashcards in their sets"
    ON flashcards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM flashcard_sets
            WHERE flashcard_sets.id = flashcards.set_id
            AND flashcard_sets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update flashcards in their sets" ON flashcards;
CREATE POLICY "Users can update flashcards in their sets"
    ON flashcards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets
            WHERE flashcard_sets.id = flashcards.set_id
            AND flashcard_sets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete flashcards in their sets" ON flashcards;
CREATE POLICY "Users can delete flashcards in their sets"
    ON flashcards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets
            WHERE flashcard_sets.id = flashcards.set_id
            AND flashcard_sets.user_id = auth.uid()
        )
    );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_flashcard_sets_updated_at ON flashcard_sets;
CREATE TRIGGER update_flashcard_sets_updated_at
    BEFORE UPDATE ON flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Verify Tables Created

In Supabase → Table Editor, you should see:
- ✅ `flashcard_sets` table
- ✅ `flashcards` table

---

## 🔧 Step 2: Backend Deployment (Render)

### 2.1 Update Backend (if needed)

Make sure the flashcards router is included in `app/main.py`:

```python
from app.api import notes, folders, flashcards

# Include routers
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(flashcards.router)  # ← Make sure this is here
```

### 2.2 Push to GitHub

```bash
cd Study_Sharper_Backend
git add .
git commit -m "Add flashcards feature"
git push origin main
```

### 2.3 Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Find your backend service** (should already exist)
3. **Trigger Manual Deploy** or wait for auto-deploy from GitHub
4. **Set Environment Variables** (if not already set):

| Variable Name | Value | Where to Find |
|---------------|-------|---------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` | Supabase → Settings → API → service_role key ⚠️ |
| `OPENROUTER_API_KEY` | `sk-or-xxx` | OpenRouter → API Keys |
| `ALLOWED_ORIGINS` | Your Vercel URL | E.g., `https://your-app.vercel.app` |

⚠️ **CRITICAL**: Use `SUPABASE_SERVICE_ROLE_KEY`, NOT the anon key!

### 2.4 Test Backend

Once deployed, test the health endpoint:
```bash
curl https://your-backend.onrender.com/health
```

Should return: `{"status":"ok"}`

Test flashcards endpoint (should return 401 without auth):
```bash
curl https://your-backend.onrender.com/api/flashcards/sets
```

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### 3.1 Update Environment Variable

**Update your `.env.local` (or create if missing):**

```bash
# Frontend Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

⚠️ **Important**: The variable is `NEXT_PUBLIC_BACKEND_URL` (not `BACKEND_API_URL`)

### 3.2 Update API Routes (if needed)

Check that all API routes use the correct env var:

```typescript
// src/app/api/flashcards/*/route.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
```

### 3.3 Push to GitHub

```bash
cd Study_Sharper_Frontend
git add .
git commit -m "Add flashcards feature and update backend URL"
git push origin main
```

### 3.4 Deploy on Vercel

**Option A: Auto-Deploy (Recommended)**
- Vercel should auto-deploy from GitHub push
- Watch the deployment in Vercel Dashboard

**Option B: Manual Deploy**
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Find your project
3. Click "Deploy" → "Redeploy"

### 3.5 Set Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx...` (anon key) | Production |
| `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com` | Production |

⚠️ **CRITICAL**: Frontend uses `ANON_KEY`, NOT service role key!

After adding/changing env vars, click **"Redeploy"** for changes to take effect.

---

## ✅ Step 4: Verify Deployment

### 4.1 Check Backend

1. Visit: `https://your-backend.onrender.com/health`
   - Should return `{"status":"ok"}`

2. Visit: `https://your-backend.onrender.com/docs`
   - Should show FastAPI Swagger docs
   - Look for `/api/flashcards/*` endpoints

### 4.2 Check Frontend

1. Visit: `https://your-app.vercel.app`
2. Log in with your account
3. Go to: `/study/flashcards`
4. Check browser console (F12) for errors

### 4.3 Test Flashcard Generation

1. **Create a Note**:
   - Go to `/notes`
   - Create a note with study content
   - Save it

2. **Generate Flashcards**:
   - Go to `/study/flashcards`
   - Click "Create New Set"
   - Select your note
   - Click "Generate Flashcards"
   - **Wait 5-10 seconds**

3. **Verify Success**:
   - Should redirect to study page
   - Should see flashcards loaded
   - Should be able to flip cards

---

## 🐛 Troubleshooting

### Issue: "Failed to generate flashcards"

**Check 1: Backend Environment Variables**
- Go to Render → Your Service → Environment
- Verify `OPENROUTER_API_KEY` is set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key!)

**Check 2: Backend Logs**
- Go to Render → Your Service → Logs
- Look for errors during flashcard generation
- Common errors:
  - `401 Unauthorized` → Check OpenRouter API key
  - `403 Forbidden` → Check Supabase service role key
  - `500 Internal Server Error` → Check backend logs

**Check 3: Frontend Network Tab**
- Open browser DevTools (F12) → Network tab
- Try generating flashcards
- Look for failed requests
- Check request URL (should point to your Render backend)

### Issue: "CORS Error"

**Solution**: Update `ALLOWED_ORIGINS` in Render:
- Render → Your Service → Environment
- Set `ALLOWED_ORIGINS` to: `https://your-app.vercel.app,https://your-app-git-main-username.vercel.app`
- Redeploy backend

### Issue: "Table does not exist"

**Solution**: Run the flashcard SQL schema in Supabase:
- Supabase → SQL Editor
- Paste and run the schema from Step 1.1 above

### Issue: Cards don't flip / UI broken

**Solution**: Clear Vercel build cache:
- Vercel → Your Project → Deployments → Latest
- Click "..." menu → "Redeploy"
- Check "Clear cache and redeploy"

### Issue: "Unauthorized" errors

**Check 1: Frontend env vars**
- Vercel → Settings → Environment Variables
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct (anon key, not service role)
- Verify `NEXT_PUBLIC_BACKEND_URL` points to Render backend

**Check 2: Backend env vars**
- Render → Environment
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (service role, not anon key)

---

## 🎯 Post-Deployment Checklist

After deploying, verify these work:

- [ ] Can log in to the app
- [ ] Can view notes page
- [ ] Can create a new note
- [ ] Can navigate to `/study/flashcards`
- [ ] Can open "Create New Set" dialog
- [ ] Can see notes listed in dialog
- [ ] Can select notes and continue
- [ ] Can configure options and generate
- [ ] Generation completes in 5-10 seconds
- [ ] Redirects to study page with cards
- [ ] Can flip cards (click or Space key)
- [ ] Can rate cards (😕 or 😊)
- [ ] Mastery levels update after rating
- [ ] Progress bar updates correctly
- [ ] Can navigate with keyboard shortcuts
- [ ] Can return to flashcard list
- [ ] Can study same set again
- [ ] Progress persists across sessions

---

## 📊 Monitoring

### Backend Monitoring (Render)
- **Logs**: Render → Your Service → Logs
- **Metrics**: Render → Your Service → Metrics
- Watch for:
  - 500 errors (backend issues)
  - High response times (> 30s)
  - API key errors

### Frontend Monitoring (Vercel)
- **Analytics**: Vercel → Your Project → Analytics
- **Logs**: Vercel → Your Project → Logs
- Watch for:
  - Failed deployments
  - High error rates
  - CORS issues

### Database Monitoring (Supabase)
- **Logs**: Supabase → Logs → Postgres Logs
- **Queries**: Supabase → Database → Query Performance
- Watch for:
  - Slow queries
  - RLS policy errors
  - Connection issues

---

## 🚀 You're Live!

Once all checklist items pass, your flashcard feature is **live in production**! 🎉

**Share your app**:
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.onrender.com`

**Test URL**: `https://your-app.vercel.app/study/flashcards`

---

## 🔐 Security Reminders

⚠️ **CRITICAL**:
- ✅ Frontend uses `SUPABASE_ANON_KEY` (safe to expose)
- ✅ Backend uses `SUPABASE_SERVICE_ROLE_KEY` (never expose!)
- ✅ `OPENROUTER_API_KEY` only in backend (never frontend!)
- ✅ All frontend env vars start with `NEXT_PUBLIC_`
- ✅ CORS configured for your Vercel domain only

---

## 📞 Need Help?

If you run into issues:
1. Check backend logs in Render
2. Check browser console (F12)
3. Check network tab for failed requests
4. Verify all environment variables are set correctly
5. Try the troubleshooting section above

**Common URLs to check**:
- Backend health: `https://your-backend.onrender.com/health`
- Backend docs: `https://your-backend.onrender.com/docs`
- Frontend app: `https://your-app.vercel.app`
- Flashcards page: `https://your-app.vercel.app/study/flashcards`

---

**Good luck with deployment! 🚀**
