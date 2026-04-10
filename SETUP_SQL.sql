-- ==========================================
-- SHRIMP GROWTH TRACKER - FULL SETUP SQL
-- ==========================================
-- Copy and paste this into your Supabase SQL Editor.
-- This script sets up all tables, enums, triggers, RLS policies, and sample data.

-- 1. Create app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'worker');
  END IF;
END $$;

-- 2. Create tables
-- Profiles table (stores user-specific info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  login_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (connects users to roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'worker',
  UNIQUE (user_id, role)
);

-- Farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  doc DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feeding times config
CREATE TABLE IF NOT EXISTS public.feeding_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SAFETY FIX: Prevent data loss when schedules change
ALTER TABLE public.feed_entries ALTER COLUMN feeding_time_id DROP NOT NULL;
ALTER TABLE public.feed_entries DROP CONSTRAINT IF EXISTS feed_entries_feeding_time_id_fkey;
ALTER TABLE public.feed_entries ADD CONSTRAINT feed_entries_feeding_time_id_fkey 
  FOREIGN KEY (feeding_time_id) REFERENCES public.feeding_times(id) ON DELETE SET NULL;

-- Daily logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  abw NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, farm_id)
);

-- Feed entries table
CREATE TABLE IF NOT EXISTS public.feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE NOT NULL,
  feeding_time_id UUID REFERENCES public.feeding_times(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  feed_size TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Oxygen entries table
CREATE TABLE IF NOT EXISTS public.oxygen_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  off_time TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Utility Functions & Triggers
-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RPC Function to look up email by login_id (needed for custom login)
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

-- Trigger Function to handle new user registration
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

-- Sync auth.users to public.profiles and user_roles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Enable RLS and Set Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oxygen_entries ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Public user_roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Farms Policies
CREATE POLICY "Authenticated can view farms" ON public.farms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farms" ON public.farms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Feeding Times Policies
CREATE POLICY "Anyone authenticated can view feeding times" ON public.feeding_times FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage feeding times" ON public.feeding_times FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Daily Logs Policies
CREATE POLICY "Authenticated can view daily logs" ON public.daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage daily logs" ON public.daily_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Feed Entries Policies
CREATE POLICY "Authenticated can view feed entries" ON public.feed_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage feed entries" ON public.feed_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Oxygen Entries Policies
CREATE POLICY "Authenticated can view oxygen entries" ON public.oxygen_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage oxygen entries" ON public.oxygen_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Grant RPC Access
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_login_id(TEXT) TO authenticated;

-- 6. Insert Sample Data
-- Insert Farms
INSERT INTO public.farms (name, doc) VALUES
  ('Farm 1', '2026-01-15'),
  ('Farm 2', '2026-02-01'),
  ('Farm 3', '2026-02-20')
ON CONFLICT DO NOTHING;

-- Insert Feeding Times
INSERT INTO public.feeding_times (label, sort_order) VALUES
  ('Morning (06:00)', 1),
  ('Midday (12:00)', 2),
  ('Evening (18:00)', 3),
  ('Night (21:00)', 4)
ON CONFLICT DO NOTHING;

-- 7. Initialize Admin Account (Update this with your email)
-- This makes the specified email an admin so they can manage the farm
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'vgrajay@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::public.app_role;
