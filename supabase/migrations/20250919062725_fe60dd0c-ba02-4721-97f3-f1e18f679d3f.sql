-- Fix anonymous access warnings by explicitly restricting to authenticated users

-- Update riders policies to explicitly restrict to authenticated users
DROP POLICY IF EXISTS "rider_select_secure_2025" ON public.riders;
DROP POLICY IF EXISTS "rider_insert_secure_2025" ON public.riders;
DROP POLICY IF EXISTS "rider_update_secure_2025" ON public.riders;
DROP POLICY IF EXISTS "rider_delete_secure_2025" ON public.riders;

CREATE POLICY "rider_select_secure_2025" 
ON public.riders 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_insert_secure_2025" 
ON public.riders 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_update_secure_2025" 
ON public.riders 
FOR UPDATE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_delete_secure_2025" 
ON public.riders 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Update payments policies to explicitly restrict to authenticated users
DROP POLICY IF EXISTS "payment_select_secure_2025" ON public.payments;
DROP POLICY IF EXISTS "payment_insert_secure_2025" ON public.payments;
DROP POLICY IF EXISTS "payment_update_secure_2025" ON public.payments;
DROP POLICY IF EXISTS "payment_delete_secure_2025" ON public.payments;

CREATE POLICY "payment_select_secure_2025" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_insert_secure_2025" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_update_secure_2025" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_delete_secure_2025" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);