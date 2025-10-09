# Study Sharper Deployment Guide

## ✅ Fixes Completed

All critical errors have been fixed:

1. ✅ Created missing Next.js API routes (folders, notes, upload)
2. ✅ Created `.env.example` with all required environment variables
3. ✅ Updated `.gitignore` with proper Next.js entries
4. ✅ Fixed all TypeScript `any` types
5. ✅ Fixed backend typo (`asnyc` → `async`)
6. ✅ Removed problematic rewrite from `next.config.js`

## 📋 Deployment Steps

### Step 1: Set Up Environment Variables

1. **Create `.env.local` file** in the frontend directory:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your Supabase credentials**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional)
   - `OCR_SPACE_API_KEY`: OCR.space API key (optional, for PDF fallback)

3. **Set BACKEND_API_URL**:
   - For local development: `http://127.0.0.1:8000`
   - For production: Your deployed backend URL (see Step 2)

### Step 2: Deploy Python Backend

**Option A: Railway**
```bash
cd Study_Sharper_Backend
# Install Railway CLI: npm i -g @railway/cli
railway login
railway init
railway up
```

**Option B: Render**
1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repo (backend folder)
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Option C: Fly.io**
```bash
cd Study_Sharper_Backend
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly launch
fly deploy
```

**Important**: After deployment, copy your backend URL (e.g., `https://your-app.railway.app`)

### Step 3: Deploy Frontend to Vercel

1. **Add environment variables to Vercel**:
   - Go to your Vercel project settings
   - Add all variables from `.env.example`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `BACKEND_API_URL` (use your deployed backend URL from Step 2)
     - `OCR_SPACE_API_KEY` (optional)
     - `OCR_SPACE_API_URL` (optional)
     - `OCR_SPACE_LANGUAGE` (optional)
     - `OCR_SPACE_ENGINE` (optional)

2. **Deploy to Vercel**:
   ```bash
   cd Study_Sharper_Frontend
   # Install Vercel CLI if needed: npm i -g vercel
   vercel
   ```

   Or push to GitHub and Vercel will auto-deploy.

### Step 4: Update Backend Authentication

The backend currently has placeholder authentication. You need to:

1. **Add authentication middleware** to verify Supabase JWT tokens
2. **Extract user_id** from the token in each route
3. **Replace** all instances of `user_id = "..."` with actual user extraction

Example middleware for FastAPI:
```python
from fastapi import Header, HTTPException
from supabase import create_client

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "")
    # Verify token with Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    user = supabase.auth.get_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return user.id
```

## 🔍 Testing

### Local Testing
1. Start backend: `cd Study_Sharper_Backend && uvicorn app.main:app --reload`
2. Start frontend: `cd Study_Sharper_Frontend && npm run dev`
3. Visit `http://localhost:3000`

### Production Testing
1. Verify all environment variables are set in Vercel
2. Check Vercel deployment logs for errors
3. Test API routes by checking Network tab in browser DevTools
4. Verify backend is receiving requests (check backend logs)

## 🐛 Troubleshooting

### "Failed to fetch folders/notes"
- Check `BACKEND_API_URL` is set correctly in Vercel
- Verify backend is running and accessible
- Check CORS settings on backend

### "Unauthorized" errors
- Verify Supabase credentials are correct
- Check that backend authentication is implemented
- Ensure JWT tokens are being forwarded correctly

### Build errors on Vercel
- Check that all dependencies are in `package.json`
- Verify TypeScript types are correct
- Review Vercel build logs for specific errors

## 📝 Next Steps

1. ✅ All code fixes are complete
2. ⏳ Deploy backend to Railway/Render/Fly.io
3. ⏳ Add backend URL to Vercel environment variables
4. ⏳ Implement proper authentication in backend
5. ⏳ Test end-to-end functionality

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
