import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

/**
 * Extended vehicle data with battery mapping information
 * Comes from the vehicles_with_batteries SQL view
 */
export interface VehicleWithBattery extends Vehicle {
  // Battery fields (from joined batteries table, NULL if no battery)
  battery_id?: string | null;                    // UUID
  battery_identifier?: string | null;            // e.g., BAT00001
  service_provider?: 'BATTERY_SMART' | 'OTHER' | null;
  zone_id?: string | null;
  retrofit_date?: string | null;
  battery_location?: 'NOIDA' | 'OTHER' | null;
  usc_id?: string | null;
  battery_plan?: 'D2D' | 'B2B' | 'OTHER' | null;
  battery_status?: 'ACTIVE' | 'MAPPED' | 'UNMAPPED' | null;
  battery_created_at?: string | null;
  battery_updated_at?: string | null;

  // Computed fields
  battery_mapped?: boolean;
  mapped_battery_id?: string | null;
}

/**
 * Filter options for vehicle listing with battery state
 */
export interface VehicleWithBatteryFilters {
  // Vehicle filters
  vehicle_status?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance' | null;
  vehicle_type?: 'High Speed' | 'Low Speed' | null;

  // Battery state filter
  battery_mapped?: boolean | null;
  has_battery?: boolean | null;  // Alias for battery_mapped

  // Battery filters
  service_provider?: 'BATTERY_SMART' | 'OTHER' | null;
  battery_status?: 'ACTIVE' | 'MAPPED' | 'UNMAPPED' | null;
  zone_id?: string | null;

  // Search
  search?: string | null;  // vehicle_number or rider_name

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'vehicle_number' | 'created_at' | 'battery_mapped';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result from vehicle listing with battery information
 */
export interface VehicleWithBatteryListResult {
  vehicles: VehicleWithBattery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  stats: {
    total: number;
    with_battery: number;
    without_battery: number;
  };
}

/**
 * Lists vehicles with their battery mapping state
 *
 * Features:
 * - Shows all vehicles with battery information
 * - Filter for vehicles WITHOUT battery (battery_mapped: false)
 * - Filter for vehicles WITH battery (battery_mapped: true)
 * - Includes battery details when mapped
 * - Efficient querying via SQL view
 *
 * @param filters - Filter options
 * @returns Vehicles with battery information and statistics
 *
 * @example
 * ```typescript
 * // Get all vehicles with battery status
 * const result = await listVehiclesWithBatteries();
 *
 * // Get vehicles WITHOUT battery
 * const result = await listVehiclesWithBatteries({
 *   battery_mapped: false
 * });
 *
 * // Get vehicles WITH battery
 * const result = await listVehiclesWithBatteries({
 *   battery_mapped: true
 * });
 *
 * // Get deployed vehicles without battery
 * const result = await listVehiclesWithBatteries({
 *   vehicle_status: 'Deployed',
 *   battery_mapped: false
 * });
 * ```
 */
export async function listVehiclesWithBatteries(
  filters: VehicleWithBatteryFilters = {}
): Promise<VehicleWithBatteryListResult> {
  try {
    // Normalize pagination
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(filters.limit || 10, 100);
    const offset = (page - 1) * limit;

    // Build query from view
    let query = supabase
      .from('vehicles_with_batteries')
      .select('*', { count: 'exact' });

    // Apply vehicle status filter
    if (filters.vehicle_status !== null && filters.vehicle_status !== undefined) {
      query = query.eq('vehicle_status', filters.vehicle_status);
    }

    // Apply vehicle type filter
    if (filters.vehicle_type !== null && filters.vehicle_type !== undefined) {
      query = query.eq('vehicle_type', filters.vehicle_type);
    }

    // Apply battery mapped filter
    const hasBattery = filters.has_battery !== null && filters.has_battery !== undefined
      ? filters.has_battery
      : filters.battery_mapped;

    if (hasBattery !== null && hasBattery !== undefined) {
      if (hasBattery) {
        // Vehicles WITH battery: battery_id IS NOT NULL
        query = query.not('battery_id', 'is', null);
      } else {
        // Vehicles WITHOUT battery: battery_id IS NULL
        query = query.is('battery_id', null);
      }
    }

    // Apply service provider filter
    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      query = query.eq('service_provider', filters.service_provider);
    }

    // Apply battery status filter
    if (filters.battery_status !== null && filters.battery_status !== undefined) {
      query = query.eq('battery_status', filters.battery_status);
    }

    // Apply zone_id filter
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      query = query.eq('zone_id', filters.zone_id);
    }

    // Apply search filter
    if (filters.search !== null && filters.search !== undefined && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      query = query.or(
        `vehicle_number.ilike.%${searchTerm}%,rider_name.ilike.%${searchTerm}%`
      );
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';

    if (sortBy === 'battery_mapped') {
      query = query.order('battery_mapped', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: vehicles, count, error } = await query;

    if (error) {
      console.error('Error querying vehicles_with_batteries:', error);
      throw error;
    }

    if (!vehicles) {
      return {
        vehicles: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasMore: false,
        stats: {
          total: 0,
          with_battery: 0,
          without_battery: 0
        }
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get statistics
    const stats = await getVehicleBatteryStats(filters);

    return {
      vehicles: vehicles as VehicleWithBattery[],
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
      stats
    };

  } catch (error) {
    console.error('Unexpected error in listVehiclesWithBatteries:', error);
    throw error;
  }
}

/**
 * Get statistics about vehicles and battery mapping
 */
async function getVehicleBatteryStats(
  filters: VehicleWithBatteryFilters = {}
): Promise<VehicleWithBatteryListResult['stats']> {
  try {
    // Get total count
    let totalQuery = supabase
      .from('vehicles_with_batteries')
      .select('id', { count: 'exact', head: true });

    if (filters.vehicle_status) {
      totalQuery = totalQuery.eq('vehicle_status', filters.vehicle_status);
    }
    if (filters.vehicle_type) {
      totalQuery = totalQuery.eq('vehicle_type', filters.vehicle_type);
    }
    if (filters.service_provider) {
      totalQuery = totalQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id) {
      totalQuery = totalQuery.eq('zone_id', filters.zone_id);
    }

    const { count: total } = await totalQuery;

    // Get vehicles WITH battery
    let withBatteryQuery = supabase
      .from('vehicles_with_batteries')
      .select('id', { count: 'exact', head: true })
      .not('battery_id', 'is', null);

    if (filters.vehicle_status) {
      withBatteryQuery = withBatteryQuery.eq('vehicle_status', filters.vehicle_status);
    }
    if (filters.vehicle_type) {
      withBatteryQuery = withBatteryQuery.eq('vehicle_type', filters.vehicle_type);
    }
    if (filters.service_provider) {
      withBatteryQuery = withBatteryQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id) {
      withBatteryQuery = withBatteryQuery.eq('zone_id', filters.zone_id);
    }

    const { count: withBattery } = await withBatteryQuery;

    // Get vehicles WITHOUT battery
    let withoutBatteryQuery = supabase
      .from('vehicles_with_batteries')
      .select('id', { count: 'exact', head: true })
      .is('battery_id', null);

    if (filters.vehicle_status) {
      withoutBatteryQuery = withoutBatteryQuery.eq('vehicle_status', filters.vehicle_status);
    }
    if (filters.vehicle_type) {
      withoutBatteryQuery = withoutBatteryQuery.eq('vehicle_type', filters.vehicle_type);
    }
    if (filters.service_provider) {
      withoutBatteryQuery = withoutBatteryQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id) {
      withoutBatteryQuery = withoutBatteryQuery.eq('zone_id', filters.zone_id);
    }

    const { count: withoutBattery } = await withoutBatteryQuery;

    return {
      total: total || 0,
      with_battery: withBattery || 0,
      without_battery: withoutBattery || 0
    };
  } catch (error) {
    console.warn('Warning: Could not fetch vehicle battery stats:', error);
    return {
      total: 0,
      with_battery: 0,
      without_battery: 0
    };
  }
}

/**
 * Get vehicles without battery assigned
 * Convenience function for common query
 *
 * @param vehicleStatus - Optional filter by vehicle status
 * @returns Vehicles without battery
 */
export async function getVehiclesWithoutBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
): Promise<VehicleWithBattery[]> {
  try {
    const filters: VehicleWithBatteryFilters = {
      battery_mapped: false,
      limit: 1000  // Get all results
    };

    if (vehicleStatus) {
      filters.vehicle_status = vehicleStatus;
    }

    const result = await listVehiclesWithBatteries(filters);
    return result.vehicles;
  } catch (error) {
    console.error('Error getting vehicles without battery:', error);
    return [];
  }
}

/**
 * Get vehicles with battery assigned
 * Convenience function for common query
 *
 * @param vehicleStatus - Optional filter by vehicle status
 * @returns Vehicles with battery
 */
export async function getVehiclesWithBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
): Promise<VehicleWithBattery[]> {
  try {
    const filters: VehicleWithBatteryFilters = {
      battery_mapped: true,
      limit: 1000
    };

    if (vehicleStatus) {
      filters.vehicle_status = vehicleStatus;
    }

    const result = await listVehiclesWithBatteries(filters);
    return result.vehicles;
  } catch (error) {
    console.error('Error getting vehicles with battery:', error);
    return [];
  }
}

/**
 * Check if a vehicle has a battery mapped
 *
 * @param vehicleId - Vehicle ID
 * @returns true if battery is mapped, false otherwise
 */
export async function hasVehicleBattery(vehicleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('vehicles_with_batteries')
      .select('battery_mapped')
      .eq('id', vehicleId)
      .single();

    if (error) {
      console.warn('Error checking vehicle battery:', error);
      return false;
    }

    return data?.battery_mapped || false;
  } catch (error) {
    console.warn('Unexpected error checking vehicle battery:', error);
    return false;
  }
}

/**
 * Get the battery mapped to a specific vehicle
 *
 * @param vehicleId - Vehicle ID
 * @returns Battery information if mapped, null otherwise
 */
export async function getVehicleBattery(vehicleId: string) {
  try {
    const { data, error } = await supabase
      .from('vehicles_with_batteries')
      .select(
        'battery_id,battery_identifier,service_provider,zone_id,retrofit_date,' +
        'battery_location,usc_id,battery_plan,battery_status'
      )
      .eq('id', vehicleId)
      .single();

    if (error || !data?.battery_id) {
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Error getting vehicle battery:', error);
    return null;
  }
}
