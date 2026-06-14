
ALTER TABLE public.feed_entries ALTER COLUMN feeding_time_id DROP NOT NULL;

ALTER TABLE public.feed_entries
  DROP CONSTRAINT IF EXISTS feed_entries_feeding_time_id_fkey;

ALTER TABLE public.feed_entries
  ADD CONSTRAINT feed_entries_feeding_time_id_fkey
  FOREIGN KEY (feeding_time_id)
  REFERENCES public.feeding_times(id)
  ON DELETE SET NULL;
