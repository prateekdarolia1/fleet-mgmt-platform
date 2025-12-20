import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BatteryStats {
  total: { count: number };
  mapped: { count: number };
  unmapped: { count: number };
  active: { count: number };
}

/**
 * Fetch battery statistics
 */
export const useBatteryStats = () => {
  return useQuery({
    queryKey: ['battery-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batteries')
        .select('status');

      if (error) {
        console.error('Error fetching battery stats:', error);
        throw error;
      }

      const stats: BatteryStats = {
        total: { count: data?.length || 0 },
        mapped: { count: data?.filter(b => b.status === 'MAPPED').length || 0 },
        unmapped: { count: data?.filter(b => b.status === 'UNMAPPED').length || 0 },
        active: { count: data?.filter(b => b.status === 'ACTIVE').length || 0 }
      };

      return stats;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};
