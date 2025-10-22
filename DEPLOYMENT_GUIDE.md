# 🚀 StudySharper Deployment Guide

## ✅ Pre-Deployment Checklist

### **Backend Environment Variables (CRITICAL)**

Set these in your backend deployment platform (Render, Railway, etc.):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-...

# CORS (comma-separated, no spaces)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app

# Port (optional, most platforms set this automatically)
PORT=8000
```

### **Frontend Environment Variables**

Set these in Vercel/Netlify project settings:

```bash
# Supabase (Public keys - safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API URL (CRITICAL - must point to deployed backend)
BACKEND_API_URL=https://your-backend.onrender.com
```

---

## 🔧 Backend Deployment (Render/Railway)

### **Option A: Deploy to Render**

1. **Create New Web Service**
   - Connect your GitHub repository
   - Select `Study_Sharper_Backend` as root directory
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Set Environment Variables**
   - Go to Environment tab
   - Add all backend variables listed above
   - **CRITICAL**: Use your actual Supabase service role key (not anon key)

3. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your backend URL (e.g., `https://studysharper-backend.onrender.com`)

### **Option B: Deploy to Railway**

1. **Create New Project**
   ```bash
   railway login
   railway init
   railway up
   ```

2. **Set Environment Variables**
   ```bash
   railway variables set SUPABASE_URL=your-url
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
   railway variables set OPENROUTER_API_KEY=your-key
   railway variables set ALLOWED_ORIGINS=your-frontend-url
   ```

3. **Deploy**
   - Railway will auto-deploy
   - Note your backend URL from Railway dashboard

---

## 🌐 Frontend Deployment (Vercel)

### **Step 1: Update Environment Variables**

In Vercel project settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
BACKEND_API_URL=https://your-backend.onrender.com  # ⚠️ CRITICAL
```

### **Step 2: Deploy**

```bash
# From Study_Sharper_Frontend directory
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

---

## 🧪 Post-Deployment Testing

### **1. Test Backend Health**

```bash
curl https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "studysharper_backend",
  "version": "1.0.0"
}
```

### **2. Test Folders API**

```bash
curl https://your-backend.onrender.com/api/folders/health
```

Expected:
```json
{
  "status": "healthy",
  "service": "folders",
  "version": "1.0.0"
}
```

### **3. Test AI Chat Health**

```bash
curl https://your-backend.onrender.com/api/ai/chat/health
```

Expected:
```json
{
  "status": "healthy",
  "service": "ai_chat",
  "version": "1.0.0"
}
```

### **4. Test Frontend → Backend Connection**

1. Open your deployed frontend
2. Try to create a folder
3. Check browser console for errors
4. If you see "Failed to communicate with backend", check `BACKEND_API_URL`

---

## 🐛 Troubleshooting

### **503 Service Unavailable (Folders API)**

**Cause**: Frontend can't reach backend

**Fix**:
1. Verify `BACKEND_API_URL` is set in Vercel
2. Ensure backend is deployed and running
3. Check backend URL is correct (no trailing slash)

### **500 Internal Server Error (AI Chat)**

**Cause**: Missing environment variables or invalid API keys

**Fix**:
1. Check backend logs for specific error
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
3. Verify `OPENROUTER_API_KEY` is valid
4. Check `sentence-transformers` is installed: `pip install sentence-transformers`

### **401 Unauthorized**

**Cause**: Invalid or missing auth token

**Fix**:
1. Ensure user is logged in
2. Check Supabase auth is working
3. Verify frontend is sending `Authorization: Bearer <token>` header

### **CORS Errors**

**Cause**: Frontend URL not in `ALLOWED_ORIGINS`

**Fix**:
1. Add your Vercel URL to backend `ALLOWED_ORIGINS`
2. Include all preview URLs: `https://your-app.vercel.app,https://your-app-git-main.vercel.app`
3. Redeploy backend after changing

---

## 📊 Monitoring

### **Backend Logs**

**Render**: Dashboard → Logs tab
**Railway**: Dashboard → Deployments → View Logs

Look for:
- ✅ "All startup checks passed"
- ✅ "Environment variables validated successfully"
- ❌ "Missing required environment variables"

### **Frontend Logs**

**Vercel**: Dashboard → Deployments → Function Logs

Look for:
- API route errors
- Backend connection failures

---

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is ONLY in backend (never frontend)
- [ ] `OPENROUTER_API_KEY` is ONLY in backend (never frontend)
- [ ] `ALLOWED_ORIGINS` includes only your actual frontend URLs (no wildcards in production)
- [ ] Frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service role key)
- [ ] All environment variables are set in deployment platform (not committed to git)

---

## 📝 Quick Reference

### **Required Backend Variables**
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `OPENROUTER_API_KEY` ✅
- `ALLOWED_ORIGINS` ✅

### **Required Frontend Variables**
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `BACKEND_API_URL` ✅

### **Health Check URLs**
- Backend: `https://your-backend.com/health`
- Folders: `https://your-backend.com/api/folders/health`
- AI Chat: `https://your-backend.com/api/ai/chat/health`
- Flashcard Chatbot: `https://your-backend.com/api/flashcards/chatbot/health`

---

## 🎯 Deployment Order

1. **Deploy Backend First**
   - Set all environment variables
   - Wait for deployment to complete
   - Test health endpoints
   - Note the backend URL

2. **Update Frontend Environment**
   - Set `BACKEND_API_URL` to your backend URL
   - Set Supabase public keys

3. **Deploy Frontend**
   - Deploy to Vercel
   - Test in browser

4. **Update Backend CORS**
   - Add frontend URL to `ALLOWED_ORIGINS`
   - Redeploy backend

5. **Final Testing**
   - Test folder creation
   - Test AI chat
   - Test flashcard generation
   - Check all features work end-to-end

---

## ✅ You're Ready When...

- [ ] Backend health check returns 200
- [ ] All API health endpoints return "healthy"
- [ ] Frontend can create folders without 503 errors
- [ ] AI chat works without 500 errors
- [ ] No CORS errors in browser console
- [ ] Startup checks pass (check backend logs)

---

**Last Updated**: October 15, 2025
**Version**: 1.0.0
