-- Create enum for rental frequency
CREATE TYPE rental_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Create enum for payment type
CREATE TYPE payment_type AS ENUM ('security_deposit', 'rental');

-- Create rider_ledgers table
CREATE TABLE public.rider_ledgers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id TEXT NOT NULL UNIQUE,
  rider_name TEXT NOT NULL,
  security_deposit_amount NUMERIC NOT NULL,
  rental_frequency rental_frequency NOT NULL,
  rental_amount NUMERIC NOT NULL,
  rental_start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rider_ledgers ENABLE ROW LEVEL SECURITY;

-- Add payment_type column to payments table
ALTER TABLE public.payments ADD COLUMN payment_type payment_type NOT NULL DEFAULT 'rental';

-- Add ledger_id column to payments table to link payments to ledgers
ALTER TABLE public.payments ADD COLUMN ledger_id UUID REFERENCES public.rider_ledgers(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates on rider_ledgers
CREATE TRIGGER update_rider_ledgers_updated_at
BEFORE UPDATE ON public.rider_ledgers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create policies for rider_ledgers (assuming no auth for now, adjust as needed)
CREATE POLICY "Anyone can view ledgers" 
ON public.rider_ledgers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create ledgers" 
ON public.rider_ledgers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update ledgers" 
ON public.rider_ledgers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete ledgers" 
ON public.rider_ledgers 
FOR DELETE 
USING (true);