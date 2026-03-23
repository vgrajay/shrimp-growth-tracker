-- Remove worker/authenticated ability to add feed log entries
DROP POLICY IF EXISTS "Authenticated can insert feed entries" ON public.feed_entries;

-- Allow only admins to insert feed entries
CREATE POLICY "Admins can insert feed entries" ON public.feed_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
