# ✅ Production Deployment Checklist

## 🎯 Quick Start

### **Before You Deploy**

1. **Run Backend Deployment Check**
   ```bash
   cd Study_Sharper_Backend
   python check_deployment.py
   ```
   
   This will verify:
   - ✅ Environment variables are set
   - ✅ Dependencies are installed
   - ✅ Supabase connection works
   - ✅ OpenRouter API works

2. **Fix Any Issues**
   - If checks fail, follow the error messages
   - See `DEPLOYMENT_GUIDE.md` for detailed fixes

---

## 📋 Deployment Steps

### **Step 1: Deploy Backend** ⏱️ ~5 minutes

1. **Choose Platform**: Render or Railway
   
2. **Set Environment Variables** (CRITICAL):
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # NOT the anon key!
   OPENROUTER_API_KEY=sk-or-v1-...
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

3. **Deploy**:
   - **Render**: Connect GitHub → Set vars → Deploy
   - **Railway**: `railway up` → Set vars in dashboard

4. **Verify**:
   ```bash
   curl https://your-backend.com/health
   ```
   Should return: `{"status": "healthy"}`

5. **Note Your Backend URL**: `https://your-backend.onrender.com`

---

### **Step 2: Update Frontend Environment** ⏱️ ~2 minutes

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add/Update These Variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...  # Use ANON key here
   BACKEND_API_URL=https://your-backend.onrender.com  # ⚠️ CRITICAL
   ```

3. **Save Changes**

---

### **Step 3: Deploy Frontend** ⏱️ ~3 minutes

1. **Trigger Deployment**:
   - Push to GitHub (auto-deploy), OR
   - Manual: `vercel --prod`

2. **Wait for Build** (~2-3 minutes)

3. **Note Your Frontend URL**: `https://your-app.vercel.app`

---

### **Step 4: Update Backend CORS** ⏱️ ~2 minutes

1. **Go to Backend Deployment Platform**

2. **Update `ALLOWED_ORIGINS`**:
   ```bash
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
   ```
   
   Include ALL Vercel preview URLs!

3. **Redeploy Backend**

---

### **Step 5: Test Everything** ⏱️ ~5 minutes

#### **Backend Health Checks**

```bash
# Main health
curl https://your-backend.com/health

# Folders API
curl https://your-backend.com/api/folders/health

# AI Chat
curl https://your-backend.com/api/ai/chat/health

# Flashcard Chatbot
curl https://your-backend.com/api/flashcards/chatbot/health
```

All should return `{"status": "healthy"}`

#### **Frontend Tests**

1. **Open Your App**: `https://your-app.vercel.app`

2. **Test Login/Signup**
   - Create account or login
   - Should redirect to dashboard

3. **Test Folder Creation**
   - Click "New Folder"
   - Enter name and color
   - Click "Create"
   - ✅ Should create without errors
   - ❌ If 503 error → Check `BACKEND_API_URL`

4. **Test Note Upload**
   - Upload a PDF or create a note
   - ✅ Should save successfully
   - ❌ If errors → Check backend logs

5. **Test AI Chat**
   - Open AI chat
   - Send message: "Create flashcards from my notes"
   - ✅ Should get response
   - ❌ If 500 error → Check OpenRouter API key

6. **Check Browser Console**
   - Open DevTools → Console
   - ✅ No errors
   - ❌ If CORS errors → Check `ALLOWED_ORIGINS`

---

## 🐛 Common Issues & Fixes

### **Issue: 503 Service Unavailable (Folders)**

**Symptoms**: Can't create folders, 503 errors

**Cause**: Frontend can't reach backend

**Fix**:
1. Check `BACKEND_API_URL` in Vercel
2. Ensure backend is running
3. Test backend health: `curl https://your-backend.com/health`

---

### **Issue: 500 Internal Server Error (AI Chat)**

**Symptoms**: AI chat fails with 500 error

**Cause**: Missing/invalid API keys or dependencies

**Fix**:
1. Check backend logs for specific error
2. Verify `OPENROUTER_API_KEY` is valid
3. Verify `SUPABASE_SERVICE_ROLE_KEY` (not anon key!)
4. Check `sentence-transformers` installed

---

### **Issue: CORS Errors**

**Symptoms**: Browser console shows CORS errors

**Cause**: Frontend URL not in backend `ALLOWED_ORIGINS`

**Fix**:
1. Add your Vercel URL to `ALLOWED_ORIGINS`
2. Include preview URLs too
3. Redeploy backend

---

### **Issue: 401 Unauthorized**

**Symptoms**: All API calls fail with 401

**Cause**: Auth token issues

**Fix**:
1. Logout and login again
2. Check Supabase auth is working
3. Verify frontend has correct Supabase keys

---

## 📊 Monitoring

### **Backend Logs**

**Render**: Dashboard → Logs
**Railway**: Dashboard → Deployments → Logs

**Look for**:
- ✅ "All startup checks passed"
- ✅ "Environment variables validated"
- ❌ "Missing required environment variables"

### **Frontend Logs**

**Vercel**: Dashboard → Deployments → Function Logs

**Look for**:
- API route errors
- Backend connection failures

---

## 🎉 Success Criteria

You're ready for production when:

- [ ] Backend health check returns 200 ✅
- [ ] All API health endpoints return "healthy" ✅
- [ ] Can create folders without errors ✅
- [ ] Can upload notes successfully ✅
- [ ] AI chat responds without 500 errors ✅
- [ ] No CORS errors in console ✅
- [ ] No 503 errors ✅
- [ ] Backend logs show "All startup checks passed" ✅

---

## 🚀 You're Ready!

Once all checks pass:

1. **Share your app** with users
2. **Monitor logs** for the first few hours
3. **Test all features** thoroughly
4. **Set up error tracking** (Sentry, LogRocket, etc.)

---

## 📞 Need Help?

- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Review backend logs for specific errors
- Test health endpoints to isolate issues
- Verify all environment variables are set correctly

---

**Last Updated**: October 15, 2025
**Version**: 1.0.0
