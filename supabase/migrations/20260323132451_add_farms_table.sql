-- Create farms table
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- RLS policies for farms
CREATE POLICY "Authenticated can view farms" ON public.farms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farms" ON public.farms
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default farms
INSERT INTO public.farms (name) VALUES
  ('Farm 1'),
  ('Farm 2'),
  ('Farm 3');