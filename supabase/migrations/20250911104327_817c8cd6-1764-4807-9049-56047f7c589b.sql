-- Relax RLS for vehicles to allow anon temporarily
-- 1) Drop existing restrictive admin-only policies on vehicles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admins can view all vehicles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view all vehicles" ON public.vehicles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admins can insert vehicles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can insert vehicles" ON public.vehicles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admins can update vehicles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update vehicles" ON public.vehicles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admins can delete vehicles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can delete vehicles" ON public.vehicles';
  END IF;
END$$;

-- 2) Ensure RLS is enabled (keep it on)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 3) Create permissive open policies for temporary anon access
-- Allow anyone (anon or authenticated) to SELECT/INSERT/UPDATE
CREATE POLICY "Anyone can view vehicles"
ON public.vehicles
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update vehicles"
ON public.vehicles
FOR UPDATE
USING (true);

-- Note: We are intentionally NOT opening DELETE to everyone to avoid accidental data loss.
