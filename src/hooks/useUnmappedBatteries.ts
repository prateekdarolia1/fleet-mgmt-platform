/**
 * DDD: Battery Domain Query - Repository Pattern
 * SOLID: Single Responsibility - Fetch unmapped batteries only
 * DRY: Reusable hook for battery queries (inverse of useUnmappedVehicles)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnmappedBattery {
  id: string;
  battery_id: string;
  service_provider: string;
  zone_id: string | null;
  battery_plan: string | null;
  status: string;
  created_at: string;
}

/**
 * Fetches batteries that don't have a vehicle mapped yet
 * Business Rule: Only UNMAPPED batteries can be selected for mapping
 *
 * @returns Query result with unmapped batteries
 */
export const useUnmappedBatteries = () => {
  return useQuery({
    queryKey: ['batteries', 'unmapped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batteries')
        .select('id, battery_id, service_provider, zone_id, battery_plan, status, created_at')
        .eq('status', 'UNMAPPED')  // Business Rule: Only UNMAPPED batteries
        .order('battery_id', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch unmapped batteries: ${error.message}`);
      }

      return data as UnmappedBattery[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * DRY: Utility function to check if a battery is eligible for vehicle mapping
 * Business logic encapsulated in one place
 */
export function isBatteryEligibleForMapping(battery: UnmappedBattery): boolean {
  return battery.status === 'UNMAPPED';
}
