-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  doc DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM('admin', 'worker');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role DEFAULT 'worker'::public.app_role
);

-- Create feeding_times table
CREATE TABLE IF NOT EXISTS public.feeding_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  abw NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create feed_entries table
CREATE TABLE IF NOT EXISTS public.feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  feeding_time_id UUID NOT NULL REFERENCES public.feeding_times(id),
  amount NUMERIC(10, 2) NOT NULL,
  feed_size TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_farm_id ON public.daily_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_feed_entries_log_id ON public.feed_entries(log_id);
CREATE INDEX IF NOT EXISTS idx_feed_entries_feeding_time_id ON public.feed_entries(feeding_time_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_entries ENABLE ROW LEVEL SECURITY;

-- Insert sample farms
INSERT INTO public.farms (name, doc) VALUES
  ('Farm 1', '2026-01-15'),
  ('Farm 2', '2026-02-01'),
  ('Farm 3', '2026-02-20')
ON CONFLICT DO NOTHING;

-- Insert sample feeding times
INSERT INTO public.feeding_times (label, sort_order) VALUES
  ('Morning (06:00)', 1),
  ('Midday (12:00)', 2),
  ('Evening (18:00)', 3),
  ('Night (21:00)', 4)
ON CONFLICT DO NOTHING;
