-- Fix critical security vulnerability: Restrict vehicle data access to admins only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can update vehicles" ON public.vehicles;

-- Create secure admin-only policies following the same pattern as other tables
CREATE POLICY "Admins can view all vehicles" 
ON public.vehicles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert vehicles" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete vehicles" 
ON public.vehicles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));