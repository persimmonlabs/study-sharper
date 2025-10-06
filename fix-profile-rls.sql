-- Fix Profile RLS Policies to Allow Insert/Upsert
-- Run this in your Supabase SQL Editor

-- Drop existing profile policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate policies with INSERT support
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Verify the trigger exists for auto-creating profiles
-- If this query returns 0 rows, you need to create the trigger
SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If needed, recreate the trigger (uncomment if the above returns 0):
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     INSERT INTO public.profiles (id, email, first_name, last_name)
--     VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
--     ON CONFLICT (id) DO NOTHING;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
