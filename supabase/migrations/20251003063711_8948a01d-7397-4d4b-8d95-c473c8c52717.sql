-- Enable real-time for vehicles table
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;