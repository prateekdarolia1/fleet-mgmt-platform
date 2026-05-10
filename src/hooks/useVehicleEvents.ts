/**
 * DDD: Vehicle Domain Events - Repository Pattern
 * SOLID: Single Responsibility - Fetch vehicle event history
 * DRY: Reusable hook for vehicle event queries
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// DDD: Vehicle Event Value Object
export interface VehicleEvent {
  id: string;
  vehicle_id: string;
  event_type: 'CREATE' | 'MAP_BATTERY' | 'UNMAP_BATTERY' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN_RIDER' | 'UNASSIGN_RIDER' | 'EXCHANGE_OUT' | 'EXCHANGE_IN';
  battery_id: string | null;
  rider_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  performed_by: string | null;
  changes: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetches event history for a specific vehicle
 * Business Rule: Events are append-only and ordered chronologically
 *
 * @param vehicleId - UUID of the vehicle
 * @returns Query result with vehicle events
 */
export const useVehicleEvents = (vehicleId: string | undefined) => {
  return useQuery({
    queryKey: ['vehicle-events', vehicleId],
    queryFn: async () => {
      if (!vehicleId) {
        return [];
      }

      const { data, error } = await (supabase as any)
        .from('vehicle_events')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch vehicle events: ${error.message}`);
      }

      return (data || []) as VehicleEvent[];
    },
    enabled: !!vehicleId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * DRY: Format event timestamp for display
 * SOLID: Single Responsibility - Time formatting only
 */
export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * DRY: Get human-readable description for vehicle event
 * SOLID: Single Responsibility - Event description mapping
 */
export function getEventDescription(event: VehicleEvent): string {
  switch (event.event_type) {
    case 'CREATE':
      return 'Vehicle created in inventory';
    case 'MAP_BATTERY':
      return `Battery ${event.battery_id || 'N/A'} mapped to vehicle`;
    case 'UNMAP_BATTERY':
      return `Battery ${event.battery_id || 'N/A'} unmapped from vehicle`;
    case 'STATUS_CHANGE':
      return `Status changed from ${event.previous_status || 'N/A'} to ${event.new_status || 'N/A'}`;
    case 'ASSIGN_RIDER':
      return `Rider ${event.rider_id || 'N/A'} assigned to vehicle`;
    case 'UNASSIGN_RIDER':
      return `Rider ${event.rider_id || 'N/A'} unassigned from vehicle`;
    case 'EXCHANGE_OUT':
      return `Rider exchanged out of this vehicle (→ ${event.changes?.new_vehicle ?? 'new vehicle'})`;
    case 'EXCHANGE_IN':
      return `Rider exchanged onto this vehicle (← ${event.changes?.old_vehicle ?? 'old vehicle'})`;
    case 'UPDATE':
      return 'Vehicle information updated';
    case 'DELETE':
      return 'Vehicle removed from inventory';
    default:
      return 'Unknown event';
  }
}
