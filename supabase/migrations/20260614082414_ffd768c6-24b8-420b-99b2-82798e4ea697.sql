
-- 1. Drop overly broad policies
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view meters" ON public.electric_meters;
DROP POLICY IF EXISTS "Authenticated can view readings" ON public.electric_readings;

-- 2. Drop redundant legacy admin policies (org-scoped owner policies already cover these)
DROP POLICY IF EXISTS "Admins can update daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Admins can delete daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Admins can update feed entries" ON public.feed_entries;
DROP POLICY IF EXISTS "Admins can delete feed entries" ON public.feed_entries;
DROP POLICY IF EXISTS "Admins can update farms" ON public.farms;
DROP POLICY IF EXISTS "Admins can insert oxygen entries" ON public.oxygen_entries;
DROP POLICY IF EXISTS "Admins can update oxygen entries" ON public.oxygen_entries;
DROP POLICY IF EXISTS "Admins can delete oxygen entries" ON public.oxygen_entries;
DROP POLICY IF EXISTS "Admins can manage meters" ON public.electric_meters;
DROP POLICY IF EXISTS "Admins can manage readings" ON public.electric_readings;

-- 3. Restrict invite_code visibility: revoke column-level SELECT on organizations.invite_code
--    Members can still see name/id; owners read invite_code via get_my_invite_code() SECURITY DEFINER fn.
REVOKE SELECT (invite_code) ON public.organizations FROM authenticated, anon;
GRANT SELECT (id, name, owner_id, created_at) ON public.organizations TO authenticated;

-- 4. Harden has_role: ignore _user_id arg, always check caller. Prevents role probing of other users.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$function$;
