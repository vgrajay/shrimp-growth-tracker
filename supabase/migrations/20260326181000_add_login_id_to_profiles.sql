-- Add login_id column to profiles for custom User ID login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_login_id ON public.profiles (login_id);

-- Function to look up email by login_id (accessible by anon/unauthenticated users)
-- This is needed so users can log in with their custom User ID
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

-- Grant execute to anon (unauthenticated) and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO authenticated;

-- Allow anon users to read profiles (only login_id column, via RPC above)
-- The RPC function uses SECURITY DEFINER so no additional RLS changes needed

-- Update the handle_new_user trigger to also store login_id from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, login_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'login_id'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker');
  RETURN NEW;
END;
$$;

-- Backfill login_id for all existing users using the email prefix (part before @)
-- e.g. vgrajay@gmail.com -> login_id = 'vgrajay'
UPDATE public.profiles p
SET login_id = SPLIT_PART(u.email, '@', 1)
FROM auth.users u
WHERE p.user_id = u.id
  AND p.login_id IS NULL;
