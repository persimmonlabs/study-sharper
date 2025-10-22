# Local Development Setup Guide

## Issue
Frontend is trying to connect to production backend instead of local backend, causing 404 errors on file uploads.

---

## Quick Fix

### **Step 1: Create/Update Frontend .env.local**

Create or update `Study_Sharper_Frontend/.env.local`:

```bash
# Supabase Configuration (use your actual values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API Configuration - LOCAL DEVELOPMENT
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

### **Step 2: Verify Backend .env**

Ensure `Study_Sharper_Backend/.env` has:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenRouter API
OPENROUTER_API_KEY=your-openrouter-api-key

# CORS Configuration - IMPORTANT FOR LOCAL DEV
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Port
PORT=8000

# Admin Token
ADMIN_TOKEN=your-secure-token

# Environment
ENVIRONMENT=development
```

### **Step 3: Restart Both Servers**

```bash
# Terminal 1 - Backend
cd Study_Sharper_Backend
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd Study_Sharper_Frontend
npm run dev
```

---

## Environment Configuration Matrix

### **Local Development**
| Service | URL | Config File |
|---------|-----|-------------|
| Frontend | `http://localhost:3000` | `.env.local` |
| Backend | `http://127.0.0.1:8000` | `.env` |
| Database | Supabase Cloud | Both |

**Frontend .env.local:**
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

**Backend .env:**
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ENVIRONMENT=development
```

---

### **Production**
| Service | URL | Config File |
|---------|-----|-------------|
| Frontend | `https://your-app.vercel.app` | Vercel env vars |
| Backend | `https://study-sharper-backend.onrender.com` | Render env vars |
| Database | Supabase Cloud | Both |

**Frontend (Vercel env vars):**
```bash
NEXT_PUBLIC_API_URL=https://study-sharper-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://study-sharper-backend.onrender.com
```

**Backend (Render env vars):**
```bash
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
ENVIRONMENT=production
```

---

## Testing Checklist

### **Backend Health Check**
```bash
# Should return: {"status":"healthy"}
curl http://127.0.0.1:8000/health
```

### **CORS Check**
```bash
# Should return CORS headers
curl -H "Origin: http://localhost:3000" -I http://127.0.0.1:8000/health
```

### **Frontend API Connection**
Open browser console and check:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
// Should show: http://127.0.0.1:8000
```

### **File Upload Test**
1. Go to `http://localhost:3000/notes`
2. Click "Upload File"
3. Select a PDF or DOCX
4. Check browser console - should POST to `http://127.0.0.1:8000/api/upload`
5. Check backend terminal - should show upload request

---

## Common Issues & Solutions

### **Issue 1: 404 on /api/upload**
**Symptom:** `POST http://localhost:3000/api/upload 404`

**Cause:** Frontend is missing `NEXT_PUBLIC_API_URL` in `.env.local`

**Fix:**
```bash
# Create Study_Sharper_Frontend/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

**Restart frontend:** `npm run dev`

---

### **Issue 2: CORS Error**
**Symptom:** `Access to fetch at 'http://127.0.0.1:8000' from origin 'http://localhost:3000' has been blocked by CORS`

**Cause:** Backend CORS not configured for localhost

**Fix:**
```bash
# In Study_Sharper_Backend/.env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Restart backend:** `python -m uvicorn app.main:app --reload`

---

### **Issue 3: Connection Refused**
**Symptom:** `Failed to fetch` or `ERR_CONNECTION_REFUSED`

**Cause:** Backend not running

**Fix:**
```bash
cd Study_Sharper_Backend
python -m uvicorn app.main:app --reload
```

**Verify:** `curl http://127.0.0.1:8000/health`

---

### **Issue 4: .env Parsing Error**
**Symptom:** `python-dotenv could not parse statement starting at line X`

**Cause:** Invalid .env syntax (inline comments, missing =, etc.)

**Fix:**
- Remove inline comments: `PORT=8000 # comment` → `PORT=8000`
- Ensure proper format: `KEY=value`
- Quote values with spaces: `KEY="value with spaces"`

---

## File Structure

```
Study_Sharper_Complete/
├── Study_Sharper_Backend/
│   ├── .env                    # Backend config (git-ignored)
│   ├── .env.example            # Template
│   └── app/
│       └── main.py
├── Study_Sharper_Frontend/
│   ├── .env.local              # Local dev config (git-ignored)
│   ├── .env.example            # Template
│   └── src/
│       └── lib/
│           └── api/
│               └── filesApi.ts # Uses NEXT_PUBLIC_API_URL
```

---

## Quick Start Commands

### **First Time Setup**

```bash
# 1. Backend setup
cd Study_Sharper_Backend
cp .env.example .env
# Edit .env with your Supabase and API keys
pip install -r requirements.txt

# 2. Frontend setup
cd ../Study_Sharper_Frontend
cp .env.example .env.local
# Edit .env.local:
# - Add your Supabase URL and anon key
# - Set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm install

# 3. Start backend (Terminal 1)
cd ../Study_Sharper_Backend
python -m uvicorn app.main:app --reload

# 4. Start frontend (Terminal 2)
cd ../Study_Sharper_Frontend
npm run dev

# 5. Open browser
# http://localhost:3000
```

---

## Environment Variables Reference

### **Frontend (.env.local)**
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000        # Local dev
# NEXT_PUBLIC_API_URL=https://your-backend.com   # Production

# Optional
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000           # Local dev
# NEXT_PUBLIC_WS_URL=wss://your-backend.com      # Production
```

### **Backend (.env)**
```bash
# Required
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
OPENROUTER_API_KEY=sk-or-xxx...
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional
PORT=8000
ADMIN_TOKEN=your-secure-token
ENVIRONMENT=development
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
```

---

## Verification Steps

### **1. Backend Running**
```bash
curl http://127.0.0.1:8000/health
# Expected: {"status":"healthy"}
```

### **2. Frontend Connected**
Open browser console:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
// Expected: http://127.0.0.1:8000
```

### **3. CORS Working**
Upload a file and check:
- Browser console: No CORS errors
- Backend terminal: Shows POST /api/upload request
- File appears in notes list

---

## Production Deployment

When deploying to production:

### **Frontend (Vercel)**
Set environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_URL=https://study-sharper-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://study-sharper-backend.onrender.com
```

### **Backend (Render)**
Set environment variables:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
OPENROUTER_API_KEY=sk-or-xxx...
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
ENVIRONMENT=production
```

---

## Ready for Local Development! 🚀

Follow the steps above and you'll have a fully functional local development environment where all features work seamlessly.
