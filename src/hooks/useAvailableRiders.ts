import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableRider {
  id: string;
  rider_id: string;
  name: string;
  status: string;
  duty_status: string;
}

export const useAvailableRiders = () => {
  const [riders, setRiders] = useState<AvailableRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableRiders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('riders')
        .select('id, rider_id, name, status, duty_status')
        .eq('status', 'active')
        .eq('duty_status', 'IDLE')
        .order('name');

      if (error) throw error;
      setRiders(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching available riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableRiders();
  }, []);

  return { riders, loading, error, refetch: fetchAvailableRiders };
};
