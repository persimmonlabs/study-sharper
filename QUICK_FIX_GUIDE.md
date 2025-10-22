# Quick Fix Guide - What You Need to Do

## The Problem
CORS errors and authentication issues preventing frontend-backend communication in production.

## The Root Causes Found

1. **Frontend authentication** - Using manual localStorage instead of Supabase client
2. **WebSocket authentication** - Same issue as above
3. **WebSocket parsing** - Trying to parse "pong" as JSON
4. **Backend CORS** - Not configured for Vercel domain

## All Fixes Are Complete in Code ✅

I've fixed all the code issues. Now you just need to deploy.

## What You Need to Do

### 1. Deploy Backend (Render)

```bash
# In Study_Sharper_Backend folder
git add .
git commit -m "Fix CORS and authentication"
git push
```

**Wait 2-5 minutes for Render to deploy**

### 2. Deploy Frontend (Vercel)

```bash
# In Study_Sharper_Frontend folder
git add .
git commit -m "Fix authentication and WebSocket"
git push
```

**Wait 1-3 minutes for Vercel to deploy**

### 3. Test

1. **Clear browser cache** (Ctrl+Shift+R) or use incognito
2. Go to: https://study-sharper.vercel.app/files
3. Open DevTools → Console
4. Should see NO errors

## What to Check

### ✅ Render Dashboard
- Service status: **Running** (green)
- Latest deployment: **Succeeded**
- Logs show: `"CORS middleware configured with 4 origins"`

### ✅ Vercel Dashboard
- Latest deployment: **Ready**
- Build status: **Success**
- No errors in deployment logs

### ✅ Browser Console (After Deployment)
**Should see**:
```
[filesApi] Fetching files from: https://...
[filesApi] Files fetched successfully: 0
✓ WebSocket connected
```

**Should NOT see**:
- ❌ CORS policy errors
- ❌ Failed to fetch errors
- ❌ JSON parse "pong" errors

## If CORS Error Persists

### Check 1: Backend Deployed?
- Go to Render dashboard
- Verify latest commit is deployed
- Check deployment logs for success

### Check 2: Browser Cache?
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or use incognito/private mode

### Check 3: Render Environment Variable (Optional)
If you want to be extra sure, set this on Render:

**Name**: `ALLOWED_ORIGINS`
**Value**: `https://study-sharper.vercel.app,http://localhost:3000,http://127.0.0.1:3000`

But the code now has this as a fallback, so it should work without it.

## Environment Variables to Verify

### Vercel (Frontend)
These should already be set:
- `NEXT_PUBLIC_API_URL` = `https://study-sharper-backend.onrender.com`
- `NEXT_PUBLIC_WS_URL` = `wss://study-sharper-backend.onrender.com`
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

### Render (Backend)
These should already be set:
- `SUPABASE_URL` = Your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
- `OPENROUTER_API_KEY` = Your OpenRouter API key
- `ALLOWED_ORIGINS` = (Optional, code has fallback)

## Quick Test Commands

### Test Backend Health
```bash
curl https://study-sharper-backend.onrender.com/health
```
Should return: `{"status":"healthy",...}`

### Test Backend Root
```bash
curl https://study-sharper-backend.onrender.com/
```
Should return: `{"message":"StudySharper API",...}`

## Summary

**All code fixes are done ✅**

**You just need to**:
1. Push backend code → Render deploys
2. Push frontend code → Vercel deploys
3. Clear browser cache
4. Test the files page

**Expected result**: Everything works, no CORS errors!

## If Still Having Issues

After deploying both backend and frontend, if you still see CORS errors:

1. **Copy the exact error message** from console
2. **Check Render logs** - Look for any errors
3. **Verify the backend URL** in the error matches: `https://study-sharper-backend.onrender.com`
4. **Check Render service status** - Make sure it's running

The fixes are comprehensive and address all the issues found. The CORS error should disappear once both deployments complete.
