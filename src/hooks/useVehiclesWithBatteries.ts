import { useQuery } from '@tanstack/react-query';
import {
  listVehiclesWithBatteries,
  getVehiclesWithoutBattery,
  getVehiclesWithBattery,
  hasVehicleBattery,
  getVehicleBattery,
  type VehicleWithBatteryFilters
} from '@/lib/vehicles/listVehiclesWithBatteries';

/**
 * Hook for fetching vehicles with battery mapping information
 *
 * @param filters - Filter options
 * @returns Query result with vehicles and battery information
 *
 * @example
 * ```typescript
 * // Get all vehicles with battery status
 * const { data, isLoading } = useVehiclesWithBatteries();
 *
 * // Get vehicles without battery
 * const { data, isLoading } = useVehiclesWithBatteries({
 *   battery_mapped: false
 * });
 *
 * // Get deployed vehicles without battery
 * const { data, isLoading } = useVehiclesWithBatteries({
 *   vehicle_status: 'Deployed',
 *   battery_mapped: false
 * });
 * ```
 */
export function useVehiclesWithBatteries(
  filters: VehicleWithBatteryFilters = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['vehicles-with-batteries', filters],
    queryFn: () => listVehiclesWithBatteries(filters),
    staleTime: 1000 * 60, // 1 minute
    enabled: options.enabled !== false
  });
}

/**
 * Hook for fetching vehicles WITHOUT battery
 *
 * @param vehicleStatus - Optional vehicle status filter
 * @returns Query result with vehicles that need batteries
 *
 * @example
 * ```typescript
 * const { data: vehiclesWithoutBattery } = useVehiclesWithoutBattery();
 *
 * // Filter by vehicle status
 * const { data: deployedWithoutBattery } = useVehiclesWithoutBattery('Deployed');
 * ```
 */
export function useVehiclesWithoutBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
) {
  return useQuery({
    queryKey: ['vehicles-without-battery', vehicleStatus],
    queryFn: () => getVehiclesWithoutBattery(vehicleStatus),
    staleTime: 1000 * 60 // 1 minute
  });
}

/**
 * Hook for fetching vehicles WITH battery
 *
 * @param vehicleStatus - Optional vehicle status filter
 * @returns Query result with vehicles that have batteries
 *
 * @example
 * ```typescript
 * const { data: vehiclesWithBattery } = useVehiclesWithBattery();
 *
 * // Filter by vehicle status
 * const { data: readyVehicles } = useVehiclesWithBattery('Ready for Deployment');
 * ```
 */
export function useVehiclesWithBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
) {
  return useQuery({
    queryKey: ['vehicles-with-battery', vehicleStatus],
    queryFn: () => getVehiclesWithBattery(vehicleStatus),
    staleTime: 1000 * 60 // 1 minute
  });
}

/**
 * Hook to check if a specific vehicle has a battery
 *
 * @param vehicleId - Vehicle ID
 * @returns Query result with boolean flag
 *
 * @example
 * ```typescript
 * const { data: hasBattery } = useVehicleBatteryStatus(vehicleId);
 * ```
 */
export function useVehicleBatteryStatus(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-battery-status', vehicleId],
    queryFn: () => hasVehicleBattery(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 // 1 minute
  });
}

/**
 * Hook to get the battery assigned to a specific vehicle
 *
 * @param vehicleId - Vehicle ID
 * @returns Query result with battery information
 *
 * @example
 * ```typescript
 * const { data: battery } = useVehicleBatteryInfo(vehicleId);
 * if (battery) {
 *   console.log(`Vehicle has battery: ${battery.battery_identifier}`);
 * }
 * ```
 */
export function useVehicleBatteryInfo(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-battery-info', vehicleId],
    queryFn: () => getVehicleBattery(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 // 1 minute
  });
}

/**
 * Composite hook for vehicle inventory with battery status
 * Returns batteries mapping status for all vehicles
 *
 * @param filters - Filter options
 * @returns Combined results with statistics
 *
 * @example
 * ```typescript
 * const {
 *   vehicles,
 *   stats,
 *   vehiclesWithoutBattery,
 *   vehiclesWithBattery
 * } = useVehicleInventoryWithBatteries({ vehicle_status: 'Deployed' });
 *
 * return (
 *   <div>
 *     <p>Total: {stats.total}</p>
 *     <p>Need Battery: {stats.without_battery}</p>
 *     <p>Ready: {stats.with_battery}</p>
 *   </div>
 * );
 * ```
 */
export function useVehicleInventoryWithBatteries(
  filters: VehicleWithBatteryFilters = {}
) {
  const allVehiclesQuery = useVehiclesWithBatteries(filters);
  const withoutBatteryQuery = useVehiclesWithoutBattery(filters.vehicle_status);
  const withBatteryQuery = useVehiclesWithBattery(filters.vehicle_status);

  return {
    // All vehicles
    vehicles: allVehiclesQuery.data?.vehicles || [],
    isLoading: allVehiclesQuery.isLoading,
    error: allVehiclesQuery.error,

    // Statistics
    stats: allVehiclesQuery.data?.stats || {
      total: 0,
      with_battery: 0,
      without_battery: 0
    },

    // Pagination
    pagination: {
      page: allVehiclesQuery.data?.page || 1,
      limit: allVehiclesQuery.data?.limit || 10,
      total: allVehiclesQuery.data?.total || 0,
      totalPages: allVehiclesQuery.data?.totalPages || 0,
      hasMore: allVehiclesQuery.data?.hasMore || false
    },

    // Separated lists
    vehiclesWithBattery: withBatteryQuery.data || [],
    vehiclesWithoutBattery: withoutBatteryQuery.data || [],

    // Refetch
    refetch: allVehiclesQuery.refetch
  };
}
