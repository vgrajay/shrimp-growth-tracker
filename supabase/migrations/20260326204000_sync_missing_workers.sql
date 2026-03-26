-- 0. Ensure login_id exists on profiles (in case you missed this earlier)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- 1. Sync any manually added users from auth.users into the profiles table
INSERT INTO public.profiles (id, user_id, display_name, login_id)
SELECT 
  id, 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)), 
  COALESCE(raw_user_meta_data->>'login_id', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Make sure your main account is an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'vgrajay@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;

-- 3. Make sure all other users are designated as workers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'worker'::app_role
FROM auth.users
WHERE email != 'vgrajay@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 4. FIX RLS POLICIES (This is why they were hiding!)
-- Drop any previous conflicting policies just in case
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public user_roles are viewable by everyone" ON public.user_roles;

-- Create policies that allow the application to actually read the data
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public user_roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
