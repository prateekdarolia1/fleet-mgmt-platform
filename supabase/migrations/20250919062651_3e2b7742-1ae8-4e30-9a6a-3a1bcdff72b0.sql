-- Force drop all policies and recreate with secure access controls

-- Get unique policy names by adding timestamp suffix to avoid conflicts
-- Drop ALL possible existing policies for riders table
DO $$
BEGIN
  -- Drop policies for riders if they exist
  DROP POLICY IF EXISTS "Authenticated users can view all riders" ON public.riders;
  DROP POLICY IF EXISTS "Authenticated users can manage riders" ON public.riders;
  DROP POLICY IF EXISTS "Only admins can view riders" ON public.riders;
  DROP POLICY IF EXISTS "Only admins can insert riders" ON public.riders;
  DROP POLICY IF EXISTS "Only admins can update riders" ON public.riders;
  DROP POLICY IF EXISTS "Only admins can delete riders" ON public.riders;
  DROP POLICY IF EXISTS "Riders: Admin view access" ON public.riders;
  DROP POLICY IF EXISTS "Riders: Admin insert access" ON public.riders;
  DROP POLICY IF EXISTS "Riders: Admin update access" ON public.riders;
  DROP POLICY IF EXISTS "Riders: Super admin delete access" ON public.riders;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if policies don't exist
  NULL;
END $$;

-- Create new secure policies for riders with unique names
CREATE POLICY "rider_select_secure_2025" 
ON public.riders 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_insert_secure_2025" 
ON public.riders 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_update_secure_2025" 
ON public.riders 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "rider_delete_secure_2025" 
ON public.riders 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Do the same for payments table
DO $$
BEGIN
  -- Drop policies for payments if they exist
  DROP POLICY IF EXISTS "Authenticated users can view all payments" ON public.payments;
  DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
  DROP POLICY IF EXISTS "Only admins can view payments" ON public.payments;
  DROP POLICY IF EXISTS "Only admins can insert payments" ON public.payments;
  DROP POLICY IF EXISTS "Only admins can update payments" ON public.payments;
  DROP POLICY IF EXISTS "Only admins can delete payments" ON public.payments;
  DROP POLICY IF EXISTS "Payments: Admin view access" ON public.payments;
  DROP POLICY IF EXISTS "Payments: Admin insert access" ON public.payments;
  DROP POLICY IF EXISTS "Payments: Admin update access" ON public.payments;
  DROP POLICY IF EXISTS "Payments: Super admin delete access" ON public.payments;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if policies don't exist
  NULL;
END $$;

-- Create new secure policies for payments
CREATE POLICY "payment_select_secure_2025" 
ON public.payments 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_insert_secure_2025" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_update_secure_2025" 
ON public.payments 
FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);

CREATE POLICY "payment_delete_secure_2025" 
ON public.payments 
FOR DELETE 
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);