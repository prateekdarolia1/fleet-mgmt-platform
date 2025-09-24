-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for payments table
CREATE POLICY "Anyone can view payments" 
ON public.payments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete payments" 
ON public.payments 
FOR DELETE 
USING (true);

-- Create basic RLS policies for profiles table
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (true);

-- Create basic RLS policies for riders table
CREATE POLICY "Anyone can view riders" 
ON public.riders 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create riders" 
ON public.riders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update riders" 
ON public.riders 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete riders" 
ON public.riders 
FOR DELETE 
USING (true);

-- Create basic RLS policies for user_roles table
CREATE POLICY "Anyone can view user_roles" 
ON public.user_roles 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create user_roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user_roles" 
ON public.user_roles 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete user_roles" 
ON public.user_roles 
FOR DELETE 
USING (true);

-- Create basic RLS policies for vehicles table
CREATE POLICY "Anyone can view vehicles" 
ON public.vehicles 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create vehicles" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete vehicles" 
ON public.vehicles 
FOR DELETE 
USING (true);