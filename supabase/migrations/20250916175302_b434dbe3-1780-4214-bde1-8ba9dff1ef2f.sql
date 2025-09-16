-- Fix critical security vulnerability: Restrict vehicle data access to admins only
-- Drop ALL existing policies on vehicles table
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can insert vehicles" ON public.vehicles; 
DROP POLICY IF EXISTS "Anyone can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;

-- Create new secure admin-only policies
CREATE POLICY "Admin select vehicles policy" 
ON public.vehicles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin insert vehicles policy" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin update vehicles policy" 
ON public.vehicles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin delete vehicles policy" 
ON public.vehicles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));