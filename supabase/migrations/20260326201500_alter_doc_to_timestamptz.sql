-- Alter the `doc` column in `farms` to be TIMESTAMPTZ so it can hold both Date and exact Time.
ALTER TABLE public.farms
ALTER COLUMN doc TYPE TIMESTAMPTZ USING doc::TIMESTAMPTZ;
