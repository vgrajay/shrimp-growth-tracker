-- SIMPLE SQL - Copy and paste into Supabase SQL Editor

-- 1. Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  doc DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Insert 3 sample farms
INSERT INTO public.farms (name, doc) VALUES
  ('Farm 1', '2026-01-15'),
  ('Farm 2', '2026-02-01'),
  ('Farm 3', '2026-02-20');

-- 3. Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  abw NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create feeding_times table
CREATE TABLE IF NOT EXISTS public.feeding_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Insert feeding times
INSERT INTO public.feeding_times (label, sort_order) VALUES
  ('Morning (06:00)', 1),
  ('Midday (12:00)', 2),
  ('Evening (18:00)', 3),
  ('Night (21:00)', 4);

-- 6. Create feed_entries table
CREATE TABLE IF NOT EXISTS public.feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  feeding_time_id UUID NOT NULL REFERENCES public.feeding_times(id),
  amount NUMERIC(10, 2) NOT NULL,
  feed_size TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Enable RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_entries ENABLE ROW LEVEL SECURITY;
