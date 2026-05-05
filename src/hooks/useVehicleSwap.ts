import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useVehicleSwap = () => {
  const [isLoading, setIsLoading] = useState(false);

  const performSwap = async (riderId: string, tempVehicleId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('perform_vehicle_swap', {
        p_rider_id: riderId,
        p_temp_vehicle_id: tempVehicleId,
      });
      if (error) throw error;
      toast.success('Vehicle swapped successfully');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to swap vehicle';
      console.error('perform_vehicle_swap failed:', err);
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const performReturn = async (riderId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('perform_swap_return', {
        p_rider_id: riderId,
      });
      if (error) throw error;
      toast.success('Swap returned — rider back on their original vehicle');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to return swap';
      console.error('perform_swap_return failed:', err);
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const performAbort = async (riderId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('perform_swap_abort', {
        p_rider_id: riderId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('perform_swap_abort failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { performSwap, performReturn, performAbort, isLoading };
};
