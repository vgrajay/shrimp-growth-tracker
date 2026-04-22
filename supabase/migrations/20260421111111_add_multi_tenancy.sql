-- Multi-Tenancy Farm Owners Migration

-- 1. Add owner_id to relevant tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.electric_meters ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Find the oldest admin user to assign existing records
DO $$
DECLARE
  v_oldest_admin_id UUID;
BEGIN
  -- Attempt to select the oldest user_id from user_roles where role = 'admin'
  SELECT user_id INTO v_oldest_admin_id FROM public.user_roles WHERE role = 'admin' ORDER BY id ASC LIMIT 1;

  -- If no admin is found, find the oldest user of any sort
  IF v_oldest_admin_id IS NULL THEN
    SELECT user_id INTO v_oldest_admin_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- If we successfully found a user to assign, update existing records
  IF v_oldest_admin_id IS NOT NULL THEN
    UPDATE public.profiles SET owner_id = v_oldest_admin_id WHERE owner_id IS NULL AND user_id != v_oldest_admin_id;
    UPDATE public.farms SET owner_id = v_oldest_admin_id WHERE owner_id IS NULL;
    UPDATE public.electric_meters SET owner_id = v_oldest_admin_id WHERE owner_id IS NULL;
  END IF;
END $$;

-- 3. Create get_auth_owner_id helper function
CREATE OR REPLACE FUNCTION public.get_auth_owner_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    -- If the current user is an admin, return their own ID
    WHEN public.has_role(auth.uid(), 'admin') THEN auth.uid()
    -- Otherwise, return the owner_id from their profile
    ELSE (SELECT p.owner_id FROM public.profiles p WHERE p.user_id = auth.uid())
  END;
$$;

-- 4. Re-create the handle_new_user trigger to recognize new admin logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role app_role;
  _owner_id UUID;
BEGIN
  _owner_id := (NEW.raw_user_meta_data->>'owner_id')::UUID;
  _role := CASE
    WHEN _owner_id IS NOT NULL THEN 'worker'::app_role
    ELSE 'admin'::app_role
  END;
  
  INSERT INTO public.profiles (user_id, display_name, owner_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), _owner_id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$;

-- 5. Drop all existing policies on our target tables to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN (
            'farms', 'profiles', 'user_roles', 'feeding_times', 
            'daily_logs', 'feed_entries', 'oxygen_entries', 
            'electric_meters', 'electric_readings'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 6. Re-create policies with strict data separation

-- FARMS
CREATE POLICY "Users can view assigned farms" ON public.farms 
  FOR SELECT TO authenticated USING (owner_id = public.get_auth_owner_id());
CREATE POLICY "Admins can manage assigned farms" ON public.farms 
  FOR ALL TO authenticated USING (owner_id = public.get_auth_owner_id() AND public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Users can view their own profile and profiles under the same owner" ON public.profiles 
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR owner_id = public.get_auth_owner_id());
CREATE POLICY "Admins can update profiles under them" ON public.profiles 
  FOR UPDATE TO authenticated USING (owner_id = public.get_auth_owner_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile via signup" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- USER ROLES
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view roles of their workers" ON public.user_roles
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT user_id FROM public.profiles WHERE owner_id = auth.uid()) 
    AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins can insert and update roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ELECTRIC METERS
CREATE POLICY "Users can view assigned meters" ON public.electric_meters 
  FOR SELECT TO authenticated USING (owner_id = public.get_auth_owner_id());
CREATE POLICY "Admins can manage assigned meters" ON public.electric_meters 
  FOR ALL TO authenticated USING (owner_id = public.get_auth_owner_id() AND public.has_role(auth.uid(), 'admin'));

-- ELECTRIC READINGS
CREATE POLICY "Users can view readings for assigned meters" ON public.electric_readings 
  FOR SELECT TO authenticated USING (meter_id IN (SELECT id FROM public.electric_meters WHERE owner_id = public.get_auth_owner_id()));
CREATE POLICY "Workers can insert readings" ON public.electric_readings
  FOR INSERT TO authenticated WITH CHECK (meter_id IN (SELECT id FROM public.electric_meters WHERE owner_id = public.get_auth_owner_id()));
CREATE POLICY "Admins can manage readings" ON public.electric_readings 
  FOR ALL TO authenticated USING (meter_id IN (SELECT id FROM public.electric_meters WHERE owner_id = public.get_auth_owner_id()) AND public.has_role(auth.uid(), 'admin'));

-- FEEDING TIMES
CREATE POLICY "Users can view feeding times" ON public.feeding_times
  FOR SELECT TO authenticated USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()) OR farm_id IS NULL);
CREATE POLICY "Admins can manage feeding times" ON public.feeding_times
  FOR ALL TO authenticated USING ((farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()) OR farm_id IS NULL) AND public.has_role(auth.uid(), 'admin'));

-- DAILY LOGS
CREATE POLICY "Users can view their logs" ON public.daily_logs
  FOR SELECT TO authenticated USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()));
CREATE POLICY "Workers can insert logs" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()));
CREATE POLICY "Workers can update logs" ON public.daily_logs
  FOR UPDATE TO authenticated USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()));
CREATE POLICY "Admins can delete logs" ON public.daily_logs
  FOR DELETE TO authenticated USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id()) AND public.has_role(auth.uid(), 'admin'));

-- FEED ENTRIES
CREATE POLICY "Users can view feed entries" ON public.feed_entries
  FOR SELECT TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())));
CREATE POLICY "Workers can insert feed entries" ON public.feed_entries
  FOR INSERT TO authenticated WITH CHECK (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())));
CREATE POLICY "Admins can update feed entries" ON public.feed_entries
  FOR UPDATE TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete feed entries" ON public.feed_entries
  FOR DELETE TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())) AND public.has_role(auth.uid(), 'admin'));

-- OXYGEN ENTRIES (If exists, this will apply)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'oxygen_entries') THEN
    EXECUTE '
      CREATE POLICY "Users can view oxygen entries" ON public.oxygen_entries FOR SELECT TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())));
      CREATE POLICY "Workers can insert oxygen entries" ON public.oxygen_entries FOR INSERT TO authenticated WITH CHECK (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())));
      CREATE POLICY "Workers can update oxygen entries" ON public.oxygen_entries FOR UPDATE TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())));
      CREATE POLICY "Admins can delete oxygen entries" ON public.oxygen_entries FOR DELETE TO authenticated USING (log_id IN (SELECT id FROM public.daily_logs WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = public.get_auth_owner_id())) AND public.has_role(auth.uid(), ''admin''));
    ';
  END IF;
END $$;
