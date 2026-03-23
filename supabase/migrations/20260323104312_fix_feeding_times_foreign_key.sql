-- Fix foreign key constraint for feeding_times to allow CASCADE deletes
-- This allows admins to delete feeding times even if they have associated feed entries

ALTER TABLE public.feed_entries
DROP CONSTRAINT feed_entries_feeding_time_id_fkey;

ALTER TABLE public.feed_entries
ADD CONSTRAINT feed_entries_feeding_time_id_fkey
FOREIGN KEY (feeding_time_id) REFERENCES public.feeding_times(id)
ON DELETE CASCADE ON UPDATE CASCADE;