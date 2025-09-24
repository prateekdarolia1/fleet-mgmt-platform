-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can create payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can delete payments" ON public.payments;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view ledgers" ON public.rider_ledgers;
DROP POLICY IF EXISTS "Anyone can create ledgers" ON public.rider_ledgers;
DROP POLICY IF EXISTS "Anyone can update ledgers" ON public.rider_ledgers;
DROP POLICY IF EXISTS "Anyone can delete ledgers" ON public.rider_ledgers;

DROP POLICY IF EXISTS "Anyone can view riders" ON public.riders;
DROP POLICY IF EXISTS "Anyone can create riders" ON public.riders;
DROP POLICY IF EXISTS "Anyone can update riders" ON public.riders;
DROP POLICY IF EXISTS "Anyone can delete riders" ON public.riders;

DROP POLICY IF EXISTS "Anyone can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can create user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can delete user_roles" ON public.user_roles;

DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can create vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can delete vehicles" ON public.vehicles;

-- Disable RLS on all tables
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_ledgers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;