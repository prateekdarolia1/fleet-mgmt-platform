-- Fix vehicles table security policies to match the role-based access pattern
-- Vehicles also contain sensitive business data that should be restricted

-- Drop existing overly permissive policies for vehicles table
DROP POLICY IF EXISTS "Authenticated users can view all vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can manage vehicles" ON public.vehicles;

-- Create secure role-based policies for vehicles table
CREATE POLICY "Only admins can view vehicles" 
ON public.vehicles 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert vehicles" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete vehicles" 
ON public.vehicles 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Update all policies to only allow authenticated users (not anonymous)
-- This addresses the anonymous access warnings

-- Update riders policies to be more restrictive
DROP POLICY IF EXISTS "Only admins can view riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can insert riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can update riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can delete riders" ON public.riders;

CREATE POLICY "Only admins can view riders" 
ON public.riders 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert riders" 
ON public.riders 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update riders" 
ON public.riders 
FOR UPDATE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete riders" 
ON public.riders 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Update payments policies to be more restrictive
DROP POLICY IF EXISTS "Only admins can view payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can delete payments" ON public.payments;

CREATE POLICY "Only admins can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Update vehicles policies to be more restrictive
CREATE POLICY "Only admins can view vehicles" 
ON public.vehicles 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert vehicles" 
ON public.vehicles 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update vehicles" 
ON public.vehicles 
FOR UPDATE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete vehicles" 
ON public.vehicles 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);