# 🎯 START HERE - StudySharper Setup

## ⚡ Quick Start (10 Minutes)

### **Step 1: Backend Setup** (5 minutes)

```bash
cd Study_Sharper_Backend

# 1. Create environment file
copy .env.example .env

# 2. Edit .env with your values (see below)
notepad .env

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start backend
uvicorn app.main:app --reload
```

**Required Environment Variables**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # From Supabase Settings → API
OPENROUTER_API_KEY=sk-or-v1-...      # From https://openrouter.ai/keys
ALLOWED_ORIGINS=http://localhost:3000
```

---

### **Step 2: Database Setup** (3 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Open file: `Study_Sharper_Backend/migrations/001_flashcard_chatbot_SAFE.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Wait for "Success"

---

### **Step 3: Frontend Setup** (2 minutes)

```bash
cd Study_Sharper_Frontend

# 1. Create environment file
copy .env.example .env.local

# 2. Edit .env.local
notepad .env.local

# 3. Install dependencies
npm install

# 4. Start frontend
npm run dev
```

**Required Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...  # ANON key (not service role)
BACKEND_API_URL=http://127.0.0.1:8000
```

---

### **Step 4: Test Everything**

```bash
# Test backend
cd Study_Sharper_Backend
python test_backend.py

# Expected output:
# ✅ Environment variables configured
# ✅ Backend is running
# ✅ Folders API is healthy
# ✅ AI Chat API is healthy
```

Then open browser:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

---

## 🐛 Having Issues?

### **500 Errors?**
→ See `FIX_500_ERRORS_NOW.md`

### **Backend won't start?**
→ See `TROUBLESHOOTING_500_ERRORS.md`

### **Ready to deploy?**
→ See `PRODUCTION_DEPLOYMENT_CHECKLIST.md`

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `FIX_500_ERRORS_NOW.md` | Quick fix for 500 errors |
| `TROUBLESHOOTING_500_ERRORS.md` | Detailed troubleshooting |
| `PRODUCTION_DEPLOYMENT_CHECKLIST.md` | Deploy to production |
| `DEPLOYMENT_GUIDE.md` | Comprehensive deployment guide |
| `FLASHCARD_CHATBOT_COMPLETE_GUIDE.md` | Feature documentation |

---

## 🔑 Where to Get API Keys

### **Supabase**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy:
   - **URL**: `https://your-project.supabase.co`
   - **Service Role Key**: `eyJhbG...` (for backend)
   - **Anon Key**: `eyJhbG...` (for frontend)

### **OpenRouter**
1. Go to https://openrouter.ai/keys
2. Create account if needed
3. Create new API key
4. Copy: `sk-or-v1-...`

---

## ✅ Success Checklist

You're ready when:

- [ ] Backend starts without errors
- [ ] `test_backend.py` shows all ✅
- [ ] Frontend loads at http://localhost:3000
- [ ] Can create account/login
- [ ] Can create folders
- [ ] Can upload notes
- [ ] AI chat works
- [ ] No 500 errors in console

---

## 🚀 Common Commands

```bash
# Backend
cd Study_Sharper_Backend
uvicorn app.main:app --reload          # Start backend
python test_backend.py                  # Test backend
python check_deployment.py              # Check deployment readiness

# Frontend
cd Study_Sharper_Frontend
npm run dev                             # Start frontend
npm run build                           # Build for production
```

---

## 📚 Documentation Structure

```
Study_Sharper_Complete/
├── README_START_HERE.md                    ← YOU ARE HERE
├── FIX_500_ERRORS_NOW.md                   ← Quick fixes
├── TROUBLESHOOTING_500_ERRORS.md           ← Detailed debugging
├── PRODUCTION_DEPLOYMENT_CHECKLIST.md      ← Deploy checklist
├── DEPLOYMENT_GUIDE.md                     ← Full deployment guide
├── FLASHCARD_CHATBOT_COMPLETE_GUIDE.md     ← Feature docs
│
├── Study_Sharper_Backend/
│   ├── .env.example                        ← Copy to .env
│   ├── start_backend.bat                   ← Quick start script
│   ├── test_backend.py                     ← Test script
│   ├── check_deployment.py                 ← Deployment checker
│   └── migrations/
│       └── 001_flashcard_chatbot_SAFE.sql  ← Run this in Supabase
│
└── Study_Sharper_Frontend/
    └── .env.example                        ← Copy to .env.local
```

---

## 🎯 Next Steps

1. **Follow Quick Start above** (10 minutes)
2. **Test everything works** (`test_backend.py`)
3. **If issues**, see `FIX_500_ERRORS_NOW.md`
4. **When ready**, see `PRODUCTION_DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: October 15, 2025
**Version**: 1.0.0
