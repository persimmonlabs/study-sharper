# CORS Configuration Fix

## Problem

Your frontend at `https://study-sharper.vercel.app` is being blocked by CORS policy when trying to access your backend at `https://study-sharper-backend.onrender.com`.

**Error Message:**
```
Access to fetch at 'https://study-sharper-backend.onrender.com/api/files' 
from origin 'https://study-sharper.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

Your backend's `ALLOWED_ORIGINS` environment variable is currently set to only allow `localhost` origins:
```
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

This works for local development but blocks production requests from Vercel.

## Solution

You need to add your Vercel domain to the `ALLOWED_ORIGINS` environment variable in your Render backend deployment.

### Step 1: Update Render Environment Variables

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your backend service**: `study-sharper-backend`
3. **Navigate to**: Environment → Environment Variables
4. **Find or add** `ALLOWED_ORIGINS` variable
5. **Set the value to**:
   ```
   https://study-sharper.vercel.app,http://localhost:3000,http://127.0.0.1:3000
   ```

### Step 2: Redeploy Backend

After updating the environment variable:
1. Render will automatically redeploy your backend
2. Wait for the deployment to complete (usually 2-5 minutes)
3. Check the logs to confirm the new CORS origins are loaded

### Expected Log Output

After redeployment, you should see in your Render logs:
```
CORS Origins: 3 configured
```

## Multiple Domains (Optional)

If you have multiple Vercel deployments (preview, production, etc.), you can add them all:

```
ALLOWED_ORIGINS=https://study-sharper.vercel.app,https://study-sharper-git-main.vercel.app,https://study-sharper-*.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

**Note**: Render doesn't support wildcards in CORS, so you'll need to add each specific domain.

## How CORS Works in Your Backend

Your backend (`app/core/config.py`) reads the `ALLOWED_ORIGINS` environment variable:

```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS_LIST = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]
```

Then in `app/main.py`, it configures the CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing After Fix

1. **Wait for Render redeploy to complete**
2. **Clear browser cache** or use incognito mode
3. **Navigate to** https://study-sharper.vercel.app/files
4. **Check console** - CORS errors should be gone
5. **Verify** files page loads properly

## Expected Behavior After Fix

✅ No CORS errors in console
✅ API requests succeed
✅ Files page loads data
✅ Folder/note creation works
✅ WebSocket connections establish

## Troubleshooting

### If CORS errors persist:

1. **Check Render logs** to confirm new CORS origins loaded:
   ```
   CORS Origins: 3 configured
   ```

2. **Verify environment variable** is set correctly in Render dashboard

3. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

4. **Check exact domain** - ensure it matches exactly:
   - ✅ `https://study-sharper.vercel.app` (correct)
   - ❌ `https://study-sharper.vercel.app/` (trailing slash - wrong)
   - ❌ `http://study-sharper.vercel.app` (http instead of https - wrong)

### If you see "CORS Origins: 1 configured" in logs:

This means the environment variable wasn't updated. Double-check:
- Variable name is exactly `ALLOWED_ORIGINS`
- Value includes your Vercel domain
- You clicked "Save" in Render dashboard
- Backend redeployed after saving

## Security Note

Never use `ALLOWED_ORIGINS=*` in production. Always specify exact domains:
- ✅ Secure: `https://study-sharper.vercel.app`
- ❌ Insecure: `*` (allows any domain)

## Quick Reference

**Render Dashboard**: https://dashboard.render.com
**Environment Variable Name**: `ALLOWED_ORIGINS`
**Value to Set**: `https://study-sharper.vercel.app,http://localhost:3000,http://127.0.0.1:3000`

After setting this, your frontend will be able to communicate with your backend!
