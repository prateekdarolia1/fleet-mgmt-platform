/**
 * DDD: Rider Domain Events - Repository Pattern
 * SOLID: Single Responsibility - Fetch rider event history
 * DRY: Reusable hook for rider event queries
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// DDD: Rider Event Value Object
export interface RiderEvent {
  id: string;
  rider_id: string;
  event_type: 'CREATE' | 'STATUS_CHANGE' | 'DUTY_STATUS_CHANGE' | 'ASSIGN_VEHICLE' | 'UNASSIGN_VEHICLE' | 'UPDATE' | 'DELETE';
  vehicle_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_duty_status: string | null;
  new_duty_status: string | null;
  reason: string | null;
  performed_by: string | null;
  changes: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetches event history for a specific rider
 * Business Rule: Events are append-only and ordered chronologically
 *
 * @param riderId - UUID of the rider
 * @returns Query result with rider events
 */
export const useRiderEvents = (riderId: string | undefined) => {
  return useQuery({
    queryKey: ['rider-events', riderId],
    queryFn: async () => {
      if (!riderId) {
        return [];
      }

      const { data, error } = await (supabase as any)
        .from('rider_events')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch rider events: ${error.message}`);
      }

      return (data || []) as RiderEvent[];
    },
    enabled: !!riderId,
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
 * DRY: Get human-readable description for rider event
 * SOLID: Single Responsibility - Event description mapping
 */
export function getEventDescription(event: RiderEvent): string {
  switch (event.event_type) {
    case 'CREATE':
      return 'Rider registered in system';
    case 'STATUS_CHANGE':
      return `Status changed from ${event.previous_status || 'N/A'} to ${event.new_status || 'N/A'}`;
    case 'DUTY_STATUS_CHANGE':
      return `Duty status changed from ${event.previous_duty_status || 'N/A'} to ${event.new_duty_status || 'N/A'}`;
    case 'ASSIGN_VEHICLE':
      return `Vehicle ${event.vehicle_id || 'N/A'} assigned to rider`;
    case 'UNASSIGN_VEHICLE':
      return `Vehicle ${event.vehicle_id || 'N/A'} unassigned from rider`;
    case 'UPDATE':
      return 'Rider information updated';
    case 'DELETE':
      return 'Rider removed from system';
    default:
      return 'Unknown event';
  }
}
