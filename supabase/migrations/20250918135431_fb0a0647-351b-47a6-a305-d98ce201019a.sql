-- Re-enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Create policies for vehicles - allow all authenticated users to view all vehicles
CREATE POLICY "Authenticated users can view all vehicles" ON public.vehicles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vehicles" ON public.vehicles
FOR ALL TO authenticated USING (true);

-- Create policies for riders - allow all authenticated users to view and manage riders
CREATE POLICY "Authenticated users can view all riders" ON public.riders
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage riders" ON public.riders
FOR ALL TO authenticated USING (true);

-- Create policies for payments - allow all authenticated users to view and manage payments
CREATE POLICY "Authenticated users can view all payments" ON public.payments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage payments" ON public.payments
FOR ALL TO authenticated USING (true);