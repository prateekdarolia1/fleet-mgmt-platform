import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BatteryEvent {
  id: string;
  battery_id: string;
  event_type: 'CREATE' | 'MAP' | 'UNMAP' | 'UPDATE' | 'DELETE';
  vehicle_id: string | null;
  previous_vehicle_id: string | null;
  reason: string | null;
  performed_by: string | null;
  changes: Record<string, any> | null;
  created_at: string;
}

export interface BatteryDetail {
  id: string;
  battery_id: string;
  status: 'ACTIVE' | 'MAPPED' | 'UNMAPPED';
  service_provider: string | null;
  zone_id: string | null;
  retrofit_date: string | null;
  location: string | null;
  usc_id: string | null;
  battery_plan: string | null;
  vehicle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatteryWithEvents {
  battery: BatteryDetail | null;
  events: BatteryEvent[];
  vehicleInfo: any | null;
  riderInfo: any | null;
}

/**
 * Fetch complete battery details including metadata, current mapping, and event history
 * @param batteryId - Battery ID (e.g., "BS23342")
 */
export const useBatteryDetail = (batteryId: string) => {
  return useQuery({
    queryKey: ['battery-detail', batteryId],
    queryFn: async () => {
      if (!batteryId) throw new Error('Battery ID is required');

      // Fetch battery metadata
      const { data: battery, error: batteryError } = await supabase
        .from('batteries')
        .select('*')
        .eq('battery_id', batteryId)
        .single();

      if (batteryError) {
        console.error('Error fetching battery:', batteryError);
        throw batteryError;
      }

      if (!battery) {
        throw new Error(`Battery ${batteryId} not found`);
      }

      // Fetch battery events (append-only history)
      let events: any[] = [];
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('battery_events' as any)
          .select('*')
          .eq('battery_id', batteryId)
          .order('created_at', { ascending: false });

        if (!eventsError && eventsData) {
          events = eventsData;
        }
      } catch (e) {
        console.warn('battery_events table may not exist:', e);
      }


      // Fetch vehicle info if battery is currently mapped
      let vehicleInfo = null;
      if (battery.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select(
            `
              id,
              vehicle_number,
              status,
              model,
              rider_id,
              rider_name,
              created_at
            `
          )
          .eq('id', battery.vehicle_id)
          .single();

        vehicleInfo = vehicle;

        // Fetch rider info if vehicle has an assigned rider
        if (vehicle?.rider_id) {
          const { data: rider } = await supabase
            .from('riders')
            .select(
              `
                id,
                rider_id,
                name,
                status,
                duty_status,
                battery_smart_id,
                mobile_number
              `
            )
            .eq('id', vehicle.rider_id)
            .single();

          if (rider) {
            vehicleInfo.rider = rider;
          }
        }
      }

      return {
        battery,
        events: events || [],
        vehicleInfo,
        riderInfo: vehicleInfo?.rider || null
      } as unknown as BatteryWithEvents;
    },
    enabled: !!batteryId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};

/**
 * Get human-readable event description
 */
export const getEventDescription = (event: BatteryEvent): string => {
  switch (event.event_type) {
    case 'CREATE':
      return `Battery created`;
    case 'MAP':
      return `Mapped to vehicle`;
    case 'UNMAP':
      return `Unmapped from vehicle${event.reason ? `: ${event.reason}` : ''}`;
    case 'UPDATE':
      return `Battery details updated`;
    case 'DELETE':
      return `Battery deleted`;
    default:
      return event.event_type;
  }
};

/**
 * Format event timestamp for display
 */
export const formatEventTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
