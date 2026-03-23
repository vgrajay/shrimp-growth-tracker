-- Add feed_size to feed_entries
ALTER TABLE public.feed_entries
ADD COLUMN feed_size TEXT;
