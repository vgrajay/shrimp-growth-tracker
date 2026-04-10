-- ==========================================
-- SHRIMP TRACK - CRITICAL SAFETY PATCH
-- ==========================================
-- This script fixes the "CASCADE" vulnerability so that 
-- your logs are NEVER deleted by schedule changes again.

-- 1. Modify feed_entries to permit NULL for time slots
ALTER TABLE public.feed_entries ALTER COLUMN feeding_time_id DROP NOT NULL;

-- 2. Update the rule to stay SAFE (SET NULL instead of CASCADE)
ALTER TABLE public.feed_entries 
DROP CONSTRAINT IF EXISTS feed_entries_feeding_time_id_fkey;

ALTER TABLE public.feed_entries 
ADD CONSTRAINT feed_entries_feeding_time_id_fkey 
FOREIGN KEY (feeding_time_id) 
REFERENCES public.feeding_times(id) 
ON DELETE SET NULL;

-- 3. Ensure login_id also exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- 4. Re-create the Login RPC (in case it was deleted)
CREATE OR REPLACE FUNCTION public.get_email_by_login_id(_login_id TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.login_id = _login_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO authenticated;

-- 5. Force the API to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Verification query (Paste this in the SQL Editor to check)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'feeding_times';
