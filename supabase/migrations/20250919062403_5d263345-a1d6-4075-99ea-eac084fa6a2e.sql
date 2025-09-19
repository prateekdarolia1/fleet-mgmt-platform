-- Fix critical security vulnerability in riders and payments tables
-- Only allow users with admin, manager, or super_admin roles to access sensitive data

-- Drop existing overly permissive policies for riders table
DROP POLICY IF EXISTS "Authenticated users can view all riders" ON public.riders;
DROP POLICY IF EXISTS "Authenticated users can manage riders" ON public.riders;

-- Create secure role-based policies for riders table
CREATE POLICY "Only admins can view riders" 
ON public.riders 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert riders" 
ON public.riders 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update riders" 
ON public.riders 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete riders" 
ON public.riders 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Fix payments table security as well (contains sensitive financial data)
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;

-- Create secure role-based policies for payments table
CREATE POLICY "Only admins can view payments" 
ON public.payments 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can update payments" 
ON public.payments 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Only admins can delete payments" 
ON public.payments 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);