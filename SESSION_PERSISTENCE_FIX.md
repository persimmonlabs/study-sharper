# Session Persistence Fix

## Problem Description

Users were experiencing authentication issues where:
1. First login works successfully
2. User navigates to notes page and everything loads fine
3. User leaves the tab open but switches to another tab/window
4. Upon returning to the Study Sharper tab, the page gets stuck on "Loading Notes..."
5. Attempting to log in again fails

## Root Causes

### 1. **Session Storage Not Persisting Properly**
- The Supabase client wasn't explicitly configured to use localStorage
- Without a storage adapter, sessions could be lost when tabs were suspended

### 2. **No Session Refresh on Tab Visibility**
- When users returned to the tab after leaving it, there was no mechanism to check if the session was still valid
- Expired tokens weren't being refreshed automatically when the tab regained focus

### 3. **Poor Error Handling for Expired Sessions**
- The notes page would attempt to fetch data with an expired session
- No retry logic or automatic session refresh before making API calls
- Users would see infinite "Loading Notes..." without helpful error messages

## Solutions Implemented

### 1. Enhanced Supabase Client Configuration (`src/lib/supabase.ts`)

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Use localStorage for better persistence
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'study-sharper-auth',
    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development',
  }
})
```

**What this does:**
- Explicitly uses `localStorage` for session storage (more reliable than default)
- Custom storage key prevents conflicts with other apps
- Enables debug logging in development for troubleshooting

### 2. Tab Visibility Session Refresh (`src/components/AuthProvider.tsx`)

Added a visibility change listener that:
- Detects when the user returns to the tab
- Checks if the current session is still valid
- Automatically refreshes the session token if needed
- Updates the auth state with the fresh session

```typescript
const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    console.log('[AuthProvider] Tab became visible, refreshing session...')
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[AuthProvider] Error refreshing session:', error)
        return
      }
      
      // If we have a session, try to refresh the token
      if (session) {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error('[AuthProvider] Error refreshing token:', refreshError)
        } else if (data.session) {
          console.log('[AuthProvider] Session refreshed successfully')
          setSession(data.session)
          setUser(data.session.user)
        }
      }
    } catch (err) {
      console.error('[AuthProvider] Unexpected error during visibility refresh:', err)
    }
  }
}
```

### 3. Improved Error Handling in Notes Page (`src/app/notes/page.tsx`)

Updated the `fetchNotes` and `fetchFolders` functions to:
- Detect when a session has expired
- Automatically attempt to refresh the session before failing
- Redirect to login page if session refresh fails
- Provide better console logging for debugging

```typescript
const { data: { session }, error: sessionError } = await supabase.auth.getSession()
if (sessionError || !session?.access_token) {
  console.error('[Notes] Session error:', sessionError)
  // Try to refresh the session
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshData.session) {
    console.error('[Notes] Failed to refresh session, redirecting to login')
    router.push('/auth/login?next=/notes')
    return
  }
  // Continue with refreshed session...
}
```

### 4. Enhanced Auth State Change Logging

Added detailed logging for auth state changes:
- `TOKEN_REFRESHED` - When Supabase successfully refreshes a token
- `SIGNED_OUT` - When a user signs out
- Visibility change events
- Session refresh attempts and results

## Testing the Fix

### To verify the fix works:

1. **Clear existing sessions:**
   ```javascript
   // In browser console
   localStorage.clear()
   ```

2. **Login to the app:**
   - Go to login page
   - Sign in with your credentials
   - Navigate to the notes page

3. **Test tab switching:**
   - With the notes page open, switch to another tab
   - Wait 2-3 minutes (to allow session refresh cycles)
   - Switch back to the Study Sharper tab
   - You should see console logs: `[AuthProvider] Tab became visible, refreshing session...`
   - The page should continue working normally

4. **Test after long idle time:**
   - Leave the tab open but inactive for 15+ minutes
   - Return to the tab
   - The session should automatically refresh
   - If the session is too old to refresh, you'll be redirected to login

## Console Logs to Monitor

When the fix is working properly, you should see these console logs:

```
[AuthProvider] Tab became visible, refreshing session...
[AuthProvider] Session refreshed successfully
[AuthProvider] Auth state changed: TOKEN_REFRESHED
[AuthProvider] Token refreshed successfully
```

If session refresh fails:
```
[Notes] Session error: [error details]
[Notes] Failed to refresh session, redirecting to login
```

## Additional Benefits

1. **Better User Experience:** Users aren't kicked out unexpectedly
2. **Automatic Recovery:** Sessions are automatically refreshed when possible
3. **Clear Debugging:** Console logs make it easy to track authentication issues
4. **Graceful Degradation:** If refresh fails, users are redirected to login with a `next` parameter to return to their intended page

## What Happens Now

- Sessions persist across tab switches and page refreshes
- When you return to the tab after some time, the session is automatically checked and refreshed
- If a session expires and can't be refreshed, you're redirected to login
- After logging in, you're returned to the page you were trying to access

## Potential Future Improvements

1. **Visual Feedback:** Show a toast notification when session is being refreshed
2. **Offline Support:** Better handling of offline scenarios
3. **Token Expiry Warning:** Warn users before their session expires
4. **Session Analytics:** Track session refresh success/failure rates
