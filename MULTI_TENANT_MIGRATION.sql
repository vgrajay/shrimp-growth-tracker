-- =====================================================
-- MULTI-TENANT MIGRATION
-- Shrimp Growth Tracker — Run once in Supabase SQL Editor
-- =====================================================
-- After running this:
--   • Each admin has their own isolated organization
--   • Workers see only their admin's farms (via invite code)
--   • RLS enforces all isolation at DB level
-- =====================================================

-- ─── 1. Create organizations table ──────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Create org_members table ────────────────────
CREATE TABLE IF NOT EXISTS public.org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ─── 3. Add org_id column to farms ──────────────────
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ─── 4. Add org_id column to electric_meters ────────
-- (safe to skip if the table doesn't exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'electric_meters') THEN
    ALTER TABLE public.electric_meters
      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 5. Migrate existing data ───────────────────────
DO $$
DECLARE
  v_admin_id  UUID;
  v_org_id    UUID;
  v_org_name  TEXT := 'My Farm';
BEGIN
  -- Find the existing admin (first admin account)
  SELECT u.id INTO v_admin_id
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    -- Try to get a friendly name from their profile
    SELECT COALESCE(display_name, 'My Farm') || '''s Organization'
    INTO v_org_name
    FROM public.profiles
    WHERE user_id = v_admin_id
    LIMIT 1;

    -- Create an organization for this admin
    INSERT INTO public.organizations (name, owner_id, invite_code)
    VALUES (v_org_name, v_admin_id, SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8))
    RETURNING id INTO v_org_id;

    -- Add admin to org_members
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_org_id, v_admin_id, 'admin')
    ON CONFLICT DO NOTHING;

    -- Link all existing farms to this org
    UPDATE public.farms SET org_id = v_org_id WHERE org_id IS NULL;

    -- Link all existing electric_meters to this org (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'electric_meters') THEN
      UPDATE public.electric_meters SET org_id = v_org_id WHERE org_id IS NULL;
    END IF;

    -- Add all existing workers to this org
    INSERT INTO public.org_members (org_id, user_id, role)
    SELECT v_org_id, ur.user_id, 'worker'
    FROM public.user_roles ur
    WHERE ur.role = 'worker'
    ON CONFLICT DO NOTHING;

  END IF;
END $$;

-- ─── 6. Make org_id NOT NULL on farms (after migration) ─
ALTER TABLE public.farms ALTER COLUMN org_id SET NOT NULL;

-- ─── 7. Helper DB functions ──────────────────────────

-- Returns the org_id the current user belongs to
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- True if the current user is a member of the given org
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = _org_id
  );
$$;

-- True if the current user owns the given org
CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_org_id()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID)      TO authenticated;

-- ─── 8. Update handle_new_user trigger ───────────────
-- Now handles two registration modes:
--   • Farm Owner: passes `org_name` in metadata → creates new org
--   • Worker:     passes `invite_code` in metadata → joins existing org
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id      UUID;
  v_invite_code TEXT;
  v_org_name    TEXT;
BEGIN
  -- Always create a profile
  INSERT INTO public.profiles (user_id, display_name, login_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'login_id'
  );

  v_invite_code := TRIM(NEW.raw_user_meta_data->>'invite_code');
  v_org_name    := TRIM(NEW.raw_user_meta_data->>'org_name');

  IF v_invite_code IS NOT NULL AND v_invite_code <> '' THEN
    -- ── Worker path: join org via invite code ──
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE invite_code = v_invite_code;

    IF v_org_id IS NOT NULL THEN
      INSERT INTO public.org_members (org_id, user_id, role)
      VALUES (v_org_id, NEW.id, 'worker')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'worker')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

  ELSIF v_org_name IS NOT NULL AND v_org_name <> '' THEN
    -- ── Farm Owner path: create new org ──
    INSERT INTO public.organizations (name, owner_id)
    VALUES (v_org_name, NEW.id)
    RETURNING id INTO v_org_id;

    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_org_id, NEW.id, 'admin');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSE
    -- ── Legacy fallback ──
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'worker')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (drop + create to ensure fresh definition)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 9. Enable RLS on new tables ────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members   ENABLE ROW LEVEL SECURITY;

-- ─── 10. Drop old broad RLS policies ────────────────
DROP POLICY IF EXISTS "Authenticated can view farms"                ON public.farms;
DROP POLICY IF EXISTS "Admins can manage farms"                     ON public.farms;
DROP POLICY IF EXISTS "Anyone authenticated can view feeding times" ON public.feeding_times;
DROP POLICY IF EXISTS "Admins can manage feeding times"             ON public.feeding_times;
DROP POLICY IF EXISTS "Authenticated can view daily logs"           ON public.daily_logs;
DROP POLICY IF EXISTS "Admins can manage daily logs"                ON public.daily_logs;
DROP POLICY IF EXISTS "Authenticated can view feed entries"         ON public.feed_entries;
DROP POLICY IF EXISTS "Admins can manage feed entries"              ON public.feed_entries;
DROP POLICY IF EXISTS "Authenticated can view oxygen entries"       ON public.oxygen_entries;
DROP POLICY IF EXISTS "Admins can manage oxygen entries"            ON public.oxygen_entries;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone"    ON public.profiles;
DROP POLICY IF EXISTS "Public user_roles are viewable by everyone"  ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles"                     ON public.user_roles;

-- ─── 11. New org-scoped RLS policies ────────────────

-- organizations: owner sees their own; member can see org they belong to
CREATE POLICY "owner_view_own_org" ON public.organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(id));

CREATE POLICY "owner_update_own_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

-- org_members: org owner can manage; members can see their own org's members
CREATE POLICY "org_owner_manage_members" ON public.org_members
  FOR ALL TO authenticated
  USING (public.is_org_owner(org_id));

CREATE POLICY "members_view_their_org" ON public.org_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_org_id() = org_id);

-- profiles: users see own profile; org members see each other
CREATE POLICY "own_profile_always" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members om1
      JOIN public.org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
    )
  );

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- user_roles: own role always; org members see each other's role
CREATE POLICY "own_role_always" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members om1
      JOIN public.org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = user_roles.user_id
    )
  );

CREATE POLICY "org_owner_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      JOIN public.organizations o ON o.id = om.org_id
      WHERE om.user_id = user_roles.user_id AND o.owner_id = auth.uid()
    )
  );

-- farms: org members view; org owner can insert/update/delete
CREATE POLICY "org_members_view_farms" ON public.farms
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org_owner_insert_farms" ON public.farms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner(org_id));

CREATE POLICY "org_owner_update_farms" ON public.farms
  FOR UPDATE TO authenticated
  USING (public.is_org_owner(org_id));

CREATE POLICY "org_owner_delete_farms" ON public.farms
  FOR DELETE TO authenticated
  USING (public.is_org_owner(org_id));

-- feeding_times: org members view their farm's times or global; owner manages
CREATE POLICY "org_members_view_feeding_times" ON public.feeding_times
  FOR SELECT TO authenticated
  USING (
    farm_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_owner_manage_feeding_times" ON public.feeding_times
  FOR ALL TO authenticated
  USING (
    farm_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_owner(f.org_id)
    )
  );

-- daily_logs: org members view + insert; org owner can update + delete
CREATE POLICY "org_members_view_daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_members_insert_daily_logs" ON public.daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_owner_update_daily_logs" ON public.daily_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_owner(f.org_id)
    )
  );

CREATE POLICY "org_owner_delete_daily_logs" ON public.daily_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id AND public.is_org_owner(f.org_id)
    )
  );

-- feed_entries: org members view + insert; org owner can also update + delete
CREATE POLICY "org_members_view_feed_entries" ON public.feed_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_members_insert_feed_entries" ON public.feed_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_owner_manage_feed_entries" ON public.feed_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_owner(f.org_id)
    )
  );

-- oxygen_entries: same pattern as feed_entries
CREATE POLICY "org_members_view_oxygen_entries" ON public.oxygen_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_members_insert_oxygen_entries" ON public.oxygen_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_member(f.org_id)
    )
  );

CREATE POLICY "org_owner_manage_oxygen_entries" ON public.oxygen_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.farms f ON f.id = dl.farm_id
      WHERE dl.id = log_id AND public.is_org_owner(f.org_id)
    )
  );

-- electric_meters + readings (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'electric_meters') THEN

    ALTER TABLE public.electric_meters ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "org_members_view_meters"  ON public.electric_meters;
    DROP POLICY IF EXISTS "org_owner_manage_meters"  ON public.electric_meters;

    EXECUTE $p$
      CREATE POLICY "org_members_view_meters" ON public.electric_meters
        FOR SELECT TO authenticated
        USING (public.is_org_member(org_id));

      CREATE POLICY "org_owner_manage_meters" ON public.electric_meters
        FOR ALL TO authenticated
        USING (public.is_org_owner(org_id));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'electric_readings') THEN

    ALTER TABLE public.electric_readings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "org_members_view_readings"   ON public.electric_readings;
    DROP POLICY IF EXISTS "org_members_insert_readings" ON public.electric_readings;
    DROP POLICY IF EXISTS "org_owner_manage_readings"   ON public.electric_readings;

    EXECUTE $p$
      CREATE POLICY "org_members_view_readings" ON public.electric_readings
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.electric_meters em
            WHERE em.id = meter_id AND public.is_org_member(em.org_id)
          )
        );

      CREATE POLICY "org_members_insert_readings" ON public.electric_readings
        FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.electric_meters em
            WHERE em.id = meter_id AND public.is_org_member(em.org_id)
          )
        );

      CREATE POLICY "org_owner_manage_readings" ON public.electric_readings
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.electric_meters em
            WHERE em.id = meter_id AND public.is_org_owner(em.org_id)
          )
        );
    $p$;
  END IF;
END $$;

-- ─── 12. RPC: get_invite_code ────────────────────────
-- Admin calls this to fetch their org's invite code for sharing with workers
CREATE OR REPLACE FUNCTION public.get_my_invite_code()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.invite_code
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_invite_code() TO authenticated;

-- ─── 13. RPC: create_farm ────────────────────────────
-- Admins call this to add a new farm to their org
CREATE OR REPLACE FUNCTION public.create_farm(_name TEXT, _doc TIMESTAMPTZ DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_farm_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = auth.uid() LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for current user';
  END IF;

  INSERT INTO public.farms (name, doc, org_id)
  VALUES (_name, _doc, v_org_id)
  RETURNING id INTO v_farm_id;

  RETURN v_farm_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_farm(TEXT, TIMESTAMPTZ) TO authenticated;

-- ─── Done! ───────────────────────────────────────────
-- Verify migration:
-- SELECT id, name, owner_id, invite_code FROM public.organizations;
-- SELECT org_id, COUNT(*) FROM public.farms GROUP BY org_id;
-- SELECT org_id, role, COUNT(*) FROM public.org_members GROUP BY org_id, role;
