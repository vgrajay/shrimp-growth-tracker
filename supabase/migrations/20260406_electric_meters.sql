-- ==========================================
-- ELECTRIC METER TRACKING SETUP
-- ==========================================

-- 1. Create electric_meters table
CREATE TABLE IF NOT EXISTS public.electric_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create electric_readings table
CREATE TABLE IF NOT EXISTS public.electric_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES public.electric_meters(id) ON DELETE CASCADE,
  reading NUMERIC(15, 2) NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meter_id, reading_date)
);

-- 3. Enable RLS
ALTER TABLE public.electric_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electric_readings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Authenticated can view meters" ON public.electric_meters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage meters" ON public.electric_meters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view readings" ON public.electric_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage readings" ON public.electric_readings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Seed initial meters
INSERT INTO public.electric_meters (name, description) VALUES
  ('Farm 1 (Meter 1)', 'Primary meter for Farm 1'),
  ('Farm 2 & 3 (Meter 2)', 'Shared meter for Farm 2 and Farm 3')
ON CONFLICT DO NOTHING;
