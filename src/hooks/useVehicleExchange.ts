import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useVehicleExchange = () => {
  const [isLoading, setIsLoading] = useState(false);

  const performExchange = async (riderId: string, newVehicleId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('perform_vehicle_exchange', {
        p_rider_id: riderId,
        p_new_vehicle_id: newVehicleId,
      });
      if (error) throw error;
      toast.success('Vehicle exchanged successfully');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to exchange vehicle';
      console.error('perform_vehicle_exchange failed:', err);
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { performExchange, isLoading };
};
