# Profile Persistence Fix Guide

## Issue
Avatar and profile data not persisting across sessions due to missing RLS INSERT policy on the `profiles` table.

## Root Cause
The Supabase `profiles` table has RLS (Row Level Security) enabled but was missing an INSERT policy. This prevents users from creating or upserting their profile data, even though the code attempts to do so.

## Solution Steps

### 1. Fix Supabase RLS Policies (REQUIRED)

Open your Supabase SQL Editor and run the contents of `fix-profile-rls.sql`:

```sql
-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate with INSERT support
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### 2. Verify Database Setup

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if profiles table exists
SELECT * FROM profiles LIMIT 1;

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check trigger exists
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

### 3. Test the Fix

1. **Clear existing session**: Log out completely
2. **Log back in**: Sign in with your account
3. **Go to Account page**: Navigate to `/account`
4. **Select an avatar**: Click on any avatar emoji
5. **Navigate away**: Go to Dashboard or another tab
6. **Return to Account**: The avatar should still be selected
7. **Refresh page**: Avatar should persist after full page reload
8. **Check header**: The avatar should appear in the top-right navigation

### 4. Verify Data Isolation

Test with multiple accounts:

1. Create/login as User A → Select avatar 🤓
2. Log out
3. Create/login as User B → Select avatar 😊
4. Log out
5. Log back in as User A → Should still see 🤓
6. Log back in as User B → Should still see 😊

## Technical Details

### Profile Hydration Flow

1. **Login**: `AuthProvider` loads user session
2. **Profile Load**: `loadProfile()` fetches from `profiles` table
3. **Context Update**: Profile exposed via `useAuth()` hook
4. **Component Sync**: Header and Account page consume shared profile
5. **Avatar Update**: `handleAvatarSelect()` upserts to database
6. **Refresh**: `refreshProfile()` reloads from database
7. **Event Dispatch**: Custom event updates header immediately

### RLS Policy Requirements

For proper data isolation, each table needs:
- **SELECT**: Users can only view their own rows
- **INSERT**: Users can only create rows with their own user_id
- **UPDATE**: Users can only modify their own rows
- **DELETE**: Users can only delete their own rows

### Current Implementation

- ✅ `AuthProvider` hydrates profile on login
- ✅ `HeaderNav` displays avatar from shared context
- ✅ `account/page.tsx` upserts avatar to database
- ✅ All data queries filtered by `user_id` or `auth.uid()`
- ✅ RLS policies enforce row-level isolation
- ⚠️ **REQUIRED**: Run SQL fix to enable INSERT policy

## Troubleshooting

### Avatar doesn't save
- **Check**: Run the SQL fix in Supabase
- **Verify**: Check browser console for Supabase errors
- **Test**: Try manually inserting a profile row in Supabase

### Avatar saves but doesn't persist
- **Check**: Verify `refreshProfile()` is called after update
- **Check**: Ensure `AuthProvider` is wrapping your app
- **Test**: Check Supabase table to see if avatar_url is saved

### Wrong user's data appears
- **Check**: Verify all queries use `auth.uid()` or `user.id`
- **Check**: Ensure RLS policies are enabled on all tables
- **Test**: Log in as different users and verify data isolation

### Profile not loading on login
- **Check**: Verify trigger `on_auth_user_created` exists
- **Check**: Ensure profile row exists in database
- **Test**: Manually create profile row if missing

## Files Modified

- `src/components/AuthProvider.tsx` - Added profile hydration
- `src/components/HeaderNav.tsx` - Consumes shared profile
- `src/app/account/page.tsx` - Upserts avatar with refreshProfile
- `fix-profile-rls.sql` - SQL migration to fix RLS policies

## Next Steps

After applying the SQL fix:
1. Test avatar persistence thoroughly
2. Verify multi-user data isolation
3. Consider adding loading states for better UX
4. Add error toast notifications for failed updates
