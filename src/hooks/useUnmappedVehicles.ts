/**
 * DDD: Vehicle Domain Query - Repository Pattern
 * SOLID: Single Responsibility - Fetch unmapped vehicles only
 * DRY: Reusable hook for vehicle queries
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnmappedVehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  status: string;
  battery_id: string | null;
}

/**
 * Fetches vehicles that don't have a battery mapped yet
 * Business Rule: Only vehicles without battery can be selected for mapping
 *
 * @returns Query result with unmapped vehicles
 */
export const useUnmappedVehicles = () => {
  return useQuery({
    queryKey: ['vehicles', 'unmapped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vehicle_number, make, model, status, battery_id')
        .is('battery_id', null)  // Business Rule: Battery must be null
        .order('vehicle_number', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch unmapped vehicles: ${error.message}`);
      }

      return data as UnmappedVehicle[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * DRY: Utility function to check if a vehicle is eligible for battery mapping
 * Business logic encapsulated in one place
 */
export function isVehicleEligibleForMapping(vehicle: UnmappedVehicle): boolean {
  return vehicle.battery_id === null;
}
