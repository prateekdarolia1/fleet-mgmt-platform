-- Create enum for vehicle status
CREATE TYPE vehicle_status AS ENUM ('Ready for Deployment', 'Deployed', 'Under Maintenance');

-- Create enum for vehicle type  
CREATE TYPE vehicle_type AS ENUM ('High Speed', 'Low Speed');

-- Create enum for battery type
CREATE TYPE battery_type AS ENUM ('Fixed', 'Swappable');

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  chassis_number TEXT NOT NULL UNIQUE,
  motor_serial_number TEXT NOT NULL UNIQUE,
  delivery_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  pdi_done_by TEXT NOT NULL,
  registration_received BOOLEAN NOT NULL DEFAULT false,
  insurance_received BOOLEAN NOT NULL DEFAULT false,
  portable_charger_received BOOLEAN NOT NULL DEFAULT false,
  vehicle_type vehicle_type NOT NULL,
  battery_type battery_type NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'Ready for Deployment',
  rider_id TEXT,
  rider_name TEXT,
  rental_start_date DATE,
  rental_end_date DATE,
  next_maintenance_date DATE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for rider status
CREATE TYPE rider_status AS ENUM ('active', 'inactive', 'suspended');

-- Create enum for rental plan
CREATE TYPE rental_plan AS ENUM ('daily', 'weekly', 'monthly');

-- Create riders table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status rider_status NOT NULL DEFAULT 'active',
  vehicle_assigned TEXT,
  rental_plan rental_plan NOT NULL,
  join_date DATE NOT NULL,
  last_payment_date DATE,
  license_document BOOLEAN NOT NULL DEFAULT false,
  aadhar_document BOOLEAN NOT NULL DEFAULT false,
  agreement_document BOOLEAN NOT NULL DEFAULT false,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');

-- Create enum for payment mode
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'bank-transfer', 'card');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  rider_id TEXT NOT NULL,
  rider_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_mode payment_mode,
  rental_period TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicles
CREATE POLICY "Users can view all vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Users can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Users can delete vehicles" ON public.vehicles FOR DELETE USING (true);

-- Create RLS policies for riders
CREATE POLICY "Users can view all riders" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Users can insert riders" ON public.riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update riders" ON public.riders FOR UPDATE USING (true);
CREATE POLICY "Users can delete riders" ON public.riders FOR DELETE USING (true);

-- Create RLS policies for payments
CREATE POLICY "Users can view all payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Users can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Users can delete payments" ON public.payments FOR DELETE USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_riders_updated_at
  BEFORE UPDATE ON public.riders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.vehicles (vehicle_number, make, model, color, chassis_number, motor_serial_number, delivery_date, vendor, pdi_done_by, registration_received, insurance_received, portable_charger_received, vehicle_type, battery_type, status, rider_id, rider_name, rental_start_date, rental_end_date, next_maintenance_date, location) VALUES
('LP-01-0001', 'EBlu', 'Feo', 'Black', 'CH001ABC123', 'MS001XYZ456', '2024-01-10', 'Global Transatlantic', 'Shubham', true, true, true, 'High Speed', 'Fixed', 'Deployed', 'R001', 'Arjun Kumar', '2024-01-15', '2024-02-14', '2024-02-20', 'Zone A');

INSERT INTO public.riders (rider_id, name, phone, email, status, vehicle_assigned, rental_plan, join_date, last_payment_date, license_document, aadhar_document, agreement_document, address) VALUES
('R001', 'Arjun Kumar', '+91 98765 43210', 'arjun.kumar@email.com', 'active', 'EV001', 'monthly', '2023-12-01', '2024-01-01', true, true, true, '123 Main Street, Bangalore'),
('R002', 'Priya Singh', '+91 87654 32109', 'priya.singh@email.com', 'active', 'EV015', 'weekly', '2024-01-10', '2024-01-15', true, true, false, '456 Park Avenue, Bangalore'),
('R003', 'Rajesh Patel', '+91 76543 21098', 'rajesh.patel@email.com', 'inactive', NULL, 'daily', '2023-11-15', NULL, true, false, true, '789 Garden Road, Bangalore');

INSERT INTO public.payments (payment_id, rider_id, rider_name, amount, due_date, payment_date, status, payment_mode, rental_period, notes) VALUES
('P001', 'R001', 'Arjun Kumar', 15000, '2024-02-01', '2024-01-30', 'paid', 'upi', 'Jan 2024', 'Monthly rental - Ather 450X'),
('P002', 'R002', 'Priya Singh', 4000, '2024-01-20', NULL, 'pending', NULL, 'Week 3 Jan 2024', 'Weekly rental - TVS iQube'),
('P003', 'R003', 'Rajesh Patel', 800, '2024-01-15', NULL, 'overdue', NULL, 'Jan 15, 2024', 'Daily rental - Ola S1'),
('P004', 'R001', 'Arjun Kumar', 15000, '2024-03-01', NULL, 'pending', NULL, 'Feb 2024', 'Monthly rental - Ather 450X');