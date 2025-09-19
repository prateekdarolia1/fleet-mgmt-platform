-- Ensure permissive full-access policies for authenticated users on all key tables
-- Vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.vehicles;
CREATE POLICY "Authenticated users full access"
ON public.vehicles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.payments;
CREATE POLICY "Authenticated users full access"
ON public.payments
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Riders
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.riders;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.riders;
CREATE POLICY "Authenticated users full access"
ON public.riders
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.profiles;
CREATE POLICY "Authenticated users full access"
ON public.profiles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- User roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.user_roles;
CREATE POLICY "Authenticated users full access"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
