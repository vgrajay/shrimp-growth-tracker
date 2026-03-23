-- Add farm_id to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN farm_id UUID REFERENCES public.farms(id);

-- Drop the existing unique constraint on date
ALTER TABLE public.daily_logs DROP CONSTRAINT daily_logs_date_key;

-- Set existing daily logs to Farm 1
UPDATE public.daily_logs SET farm_id = (SELECT id FROM public.farms WHERE name = 'Farm 1');

-- Make farm_id NOT NULL after setting default
ALTER TABLE public.daily_logs ALTER COLUMN farm_id SET NOT NULL;

-- Add new unique constraint on (date, farm_id)
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_date_farm_id_key UNIQUE (date, farm_id);

-- Create duplicate logs for Farm 2 and Farm 3
INSERT INTO public.daily_logs (date, abw, notes, farm_id)
SELECT dl.date, dl.abw, dl.notes, f.id
FROM public.daily_logs dl, public.farms f
WHERE f.name IN ('Farm 2', 'Farm 3')
AND dl.farm_id = (SELECT id FROM public.farms WHERE name = 'Farm 1');