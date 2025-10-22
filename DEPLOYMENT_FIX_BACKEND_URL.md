# Backend URL Configuration Fix

## Problem
The frontend was deployed to Vercel but was trying to connect to `http://localhost:8000`, causing connection errors and a "Failed to fetch" message on the files page.

## Solution Applied

### 1. Updated Code Fallbacks
Changed all hardcoded localhost URLs to use the production backend:

**Files Modified:**
- `src/lib/api/filesApi.ts` - API base URL
- `src/hooks/useFileWebSocket.ts` - WebSocket URL  
- `src/app/files/page.tsx` - Semantic search endpoint
- `.env.example` - Environment variable examples

**Changes:**
- HTTP API: `http://localhost:8000` → `https://study-sharper-backend.onrender.com`
- WebSocket: `ws://localhost:8000` → `wss://study-sharper-backend.onrender.com`

### 2. Environment Variables Required

**For Vercel Deployment:**

Add these environment variables in your Vercel project settings:

1. Go to: https://vercel.com/[your-project]/settings/environment-variables

2. Add the following variables:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://study-sharper-backend.onrender.com`
   - Environment: Production, Preview, Development

   **Variable 2:**
   - Name: `NEXT_PUBLIC_WS_URL`
   - Value: `wss://study-sharper-backend.onrender.com`
   - Environment: Production, Preview, Development

3. **Redeploy** your frontend after adding these variables

### 3. Local Development

For local development, create a `.env.local` file with:

```env
# For local backend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# OR for testing against production backend
# NEXT_PUBLIC_API_URL=https://study-sharper-backend.onrender.com
# NEXT_PUBLIC_WS_URL=wss://study-sharper-backend.onrender.com
```

## Testing

After redeployment, verify:
1. ✅ Files page loads without errors
2. ✅ Can fetch files and folders
3. ✅ WebSocket connects successfully
4. ✅ File uploads work
5. ✅ Semantic search functions

## Notes

- The code now defaults to production URLs if environment variables aren't set
- This ensures the app works out-of-the-box in production
- Local development can override with `.env.local`
- WebSocket uses `wss://` (secure) for production, `ws://` for local

## Deployment Checklist

- [x] Update code fallback URLs
- [ ] Add environment variables to Vercel
- [ ] Redeploy frontend
- [ ] Test files page functionality
- [ ] Verify WebSocket connection
- [ ] Test file upload/download
- [ ] Test semantic search

## Backend Requirements

Ensure your backend at `https://study-sharper-backend.onrender.com`:
- ✅ Is running and accessible
- ✅ Has CORS configured for your frontend domain
- ✅ Supports WebSocket connections at `/ws/files`
- ✅ Has all required API endpoints deployed
