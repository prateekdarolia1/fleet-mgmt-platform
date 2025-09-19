-- Fix critical security vulnerability - use different policy names to avoid conflicts

-- Drop ALL existing policies for riders table
DROP POLICY IF EXISTS "Authenticated users can view all riders" ON public.riders;
DROP POLICY IF EXISTS "Authenticated users can manage riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can view riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can insert riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can update riders" ON public.riders;
DROP POLICY IF EXISTS "Only admins can delete riders" ON public.riders;

-- Create secure role-based policies for riders table
CREATE POLICY "Riders: Admin view access" 
ON public.riders 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Riders: Admin insert access" 
ON public.riders 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Riders: Admin update access" 
ON public.riders 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Riders: Super admin delete access" 
ON public.riders 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Drop ALL existing policies for payments table
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can view payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can delete payments" ON public.payments;

-- Create secure role-based policies for payments table
CREATE POLICY "Payments: Admin view access" 
ON public.payments 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Payments: Admin insert access" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Payments: Admin update access" 
ON public.payments 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "Payments: Super admin delete access" 
ON public.payments 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);