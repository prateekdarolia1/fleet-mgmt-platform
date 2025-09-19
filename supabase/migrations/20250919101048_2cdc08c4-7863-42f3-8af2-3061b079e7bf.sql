-- Disable Row Level Security on all tables
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Authenticated users full access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.riders;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.vehicles;

-- Drop the auth trigger since we won't be using auth anymore
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop user roles functions since we're removing auth
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);