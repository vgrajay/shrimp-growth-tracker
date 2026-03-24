-- Add doc (Date of Culture) to farms table
ALTER TABLE public.farms ADD COLUMN doc DATE;

-- Update RLS policy to allow admins to update doc
CREATE POLICY "Admins can update farms" ON public.farms
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));