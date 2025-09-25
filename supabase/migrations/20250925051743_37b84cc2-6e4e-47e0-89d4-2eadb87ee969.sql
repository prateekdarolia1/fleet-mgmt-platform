-- Create places table to store Indian states/territories with cities and pincodes
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_or_ut TEXT NOT NULL,
  type TEXT NOT NULL,
  cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  pincodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better search performance
CREATE INDEX idx_places_state_or_ut ON public.places (state_or_ut);
CREATE INDEX idx_places_type ON public.places (type);
CREATE INDEX idx_places_cities ON public.places USING GIN (cities);
CREATE INDEX idx_places_pincodes ON public.places USING GIN (pincodes);

-- Enable Row Level Security
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for everyone (reference data)
CREATE POLICY "Places are viewable by everyone" 
ON public.places 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to manage places data
CREATE POLICY "Authenticated users can manage places" 
ON public.places 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_places_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();