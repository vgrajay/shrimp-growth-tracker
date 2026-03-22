
-- Fix overly permissive INSERT policy on daily_logs
DROP POLICY "Authenticated can insert daily logs" ON public.daily_logs;
CREATE POLICY "Authenticated can insert daily logs" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
