-- Fix remaining security issue with vehicles table
-- Only allow users with admin, manager, or super_admin roles to access vehicle data

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