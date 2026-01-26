import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Battery = Database['public']['Tables']['batteries']['Row'];

/**
 * Filter options for battery listing
 */
export interface BatteryFilters {
  // Status filter
  status?: 'ACTIVE' | 'MAPPED' | 'UNMAPPED' | null;

  // Service provider filter
  service_provider?: 'BATTERY_SMART' | 'OTHER' | null;

  // Zone filter
  zone_id?: string | null;

  // Map status filter
  mapped?: boolean | null;

  // Search by battery_id or usc_id
  search?: string | null;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'battery_id' | 'created_at' | 'status' | 'service_provider';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Battery listing result
 */
export interface BatteryListResult {
  batteries: Battery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  stats: {
    total: number;
    active: number;
    mapped: number;
    unmapped: number;
  };
}

/**
 * Error response for battery listing
 */
export interface BatteryListError {
  error: string;
  code?: string;
  details?: any;
}

type BatteryListResponse = BatteryListResult | BatteryListError;

/**
 * Lists batteries with filtering, searching, and pagination
 *
 * Features:
 * - Filter by status (ACTIVE, MAPPED, UNMAPPED)
 * - Filter by service_provider (BATTERY_SMART, OTHER)
 * - Filter by zone_id
 * - Filter by mapped/unmapped (based on vehicle_id)
 * - Search by battery_id or usc_id
 * - Pagination support
 * - Sorting options
 * - Battery statistics
 *
 * @param filters - Filter options
 * @returns Batteries matching filters with pagination info
 *
 * @example
 * ```typescript
 * // List all batteries with pagination
 * const result = await listBatteries({ page: 1, limit: 10 });
 *
 * // Filter by status
 * const result = await listBatteries({ status: 'ACTIVE', page: 1 });
 *
 * // Filter by mapped status
 * const result = await listBatteries({ mapped: true, page: 1 });
 *
 * // Search by battery_id
 * const result = await listBatteries({ search: 'BAT', page: 1 });
 *
 * // Multiple filters
 * const result = await listBatteries({
 *   status: 'MAPPED',
 *   service_provider: 'BATTERY_SMART',
 *   zone_id: 'ZONE1234',
 *   sortBy: 'battery_id',
 *   sortOrder: 'asc',
 *   page: 1,
 *   limit: 20
 * });
 * ```
 */
export async function listBatteries(filters: BatteryFilters = {}): Promise<BatteryListResponse> {
  try {
    // Normalize pagination
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(filters.limit || 50, 100); // Max 100 per page, default 50
    const offset = (page - 1) * limit;

    // Build query with select all fields
    let query = supabase.from('batteries').select('*', { count: 'exact' });

    // Apply status filter
    if (filters.status !== null && filters.status !== undefined) {
      query = query.eq('status', filters.status);
    }

    // Apply service_provider filter
    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      query = query.eq('service_provider', filters.service_provider);
    }

    // Apply zone_id filter
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      query = query.eq('zone_id', filters.zone_id);
    }

    // Apply mapped/unmapped filter
    if (filters.mapped !== null && filters.mapped !== undefined) {
      if (filters.mapped) {
        // Mapped: vehicle_id is not null
        query = query.not('vehicle_id', 'is', null);
      } else {
        // Unmapped: vehicle_id is null
        query = query.is('vehicle_id', null);
      }
    }

    // Apply search filter (battery_id or usc_id)
    if (filters.search !== null && filters.search !== undefined && filters.search.trim()) {
      const searchTerm = filters.search.toUpperCase().trim();
      query = query.or(
        `battery_id.ilike.%${searchTerm}%,usc_id.ilike.%${searchTerm}%`
      );
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: batteries, count, error } = await query;

    if (error) {
      return {
        error: `Failed to list batteries: ${error.message}`,
        code: error.code,
        details: error
      };
    }

    if (!batteries) {
      return {
        error: 'No data returned from database'
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Calculate statistics
    const stats = await getBatteryStats(filters);

    return {
      batteries,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
      stats
    };

  } catch (error) {
    console.error('Unexpected error in listBatteries:', error);
    return {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error
    };
  }
}

/**
 * Get battery statistics with optional filtering
 *
 * @param filters - Filter options (applied to stats)
 * @returns Statistics object with counts
 */
async function getBatteryStats(filters: BatteryFilters = {}): Promise<BatteryListResult['stats']> {
  try {
    // Get total count
    let totalQuery = supabase.from('batteries').select('id', { count: 'exact', head: true });

    // Apply same filters as main query
    if (filters.status !== null && filters.status !== undefined) {
      totalQuery = totalQuery.eq('status', filters.status);
    }
    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      totalQuery = totalQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      totalQuery = totalQuery.eq('zone_id', filters.zone_id);
    }

    const { count: total } = await totalQuery;

    // Get ACTIVE count
    let activeQuery = supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      activeQuery = activeQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      activeQuery = activeQuery.eq('zone_id', filters.zone_id);
    }

    const { count: active } = await activeQuery;

    // Get MAPPED count (vehicle_id is not null)
    let mappedQuery = supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .not('vehicle_id', 'is', null);

    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      mappedQuery = mappedQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      mappedQuery = mappedQuery.eq('zone_id', filters.zone_id);
    }

    const { count: mapped } = await mappedQuery;

    // Get UNMAPPED count (vehicle_id is null)
    let unmappedQuery = supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .is('vehicle_id', null);

    if (filters.service_provider !== null && filters.service_provider !== undefined) {
      unmappedQuery = unmappedQuery.eq('service_provider', filters.service_provider);
    }
    if (filters.zone_id !== null && filters.zone_id !== undefined) {
      unmappedQuery = unmappedQuery.eq('zone_id', filters.zone_id);
    }

    const { count: unmapped } = await unmappedQuery;

    return {
      total: total || 0,
      active: active || 0,
      mapped: mapped || 0,
      unmapped: unmapped || 0
    };
  } catch (error) {
    console.warn('Warning: Could not fetch battery stats:', error);
    return {
      total: 0,
      active: 0,
      mapped: 0,
      unmapped: 0
    };
  }
}

/**
 * Get available zone IDs for filter dropdowns
 *
 * @returns List of unique zone IDs
 */
export async function getAvailableZones(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('batteries')
      .select('zone_id')
      .not('zone_id', 'is', null)
      .order('zone_id');

    if (error) {
      console.warn('Error fetching zones:', error);
      return [];
    }

    // Get unique zone_ids
    const zones = new Set<string>();
    data?.forEach(row => {
      if (row.zone_id) {
        zones.add(row.zone_id);
      }
    });

    return Array.from(zones).sort();
  } catch (error) {
    console.warn('Unexpected error fetching zones:', error);
    return [];
  }
}

/**
 * Get unique service providers
 *
 * @returns List of available service providers
 */
export async function getAvailableServiceProviders(): Promise<('BATTERY_SMART' | 'OTHER')[]> {
  try {
    const { data, error } = await supabase
      .from('batteries')
      .select('service_provider')
      .order('service_provider');

    if (error) {
      console.warn('Error fetching service providers:', error);
      return ['BATTERY_SMART', 'OTHER'];
    }

    // Get unique service_providers
    const providers = new Set<'BATTERY_SMART' | 'OTHER'>();
    data?.forEach(row => {
      providers.add(row.service_provider);
    });

    return Array.from(providers).sort();
  } catch (error) {
    console.warn('Unexpected error fetching service providers:', error);
    return ['BATTERY_SMART', 'OTHER'];
  }
}

/**
 * Count batteries by status
 *
 * @returns Object with counts per status
 */
export async function getBatteryStatusCounts(): Promise<{
  active: number;
  mapped: number;
  unmapped: number;
  total: number;
}> {
  try {
    // Get ACTIVE count
    const { count: active } = await supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    // Get MAPPED count
    const { count: mapped } = await supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .not('vehicle_id', 'is', null);

    // Get UNMAPPED count
    const { count: unmapped } = await supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .is('vehicle_id', null);

    // Get total
    const { count: total } = await supabase
      .from('batteries')
      .select('id', { count: 'exact', head: true });

    return {
      active: active || 0,
      mapped: mapped || 0,
      unmapped: unmapped || 0,
      total: total || 0
    };
  } catch (error) {
    console.warn('Error fetching status counts:', error);
    return {
      active: 0,
      mapped: 0,
      unmapped: 0,
      total: 0
    };
  }
}

/**
 * Search batteries by partial match
 * Searches battery_id and usc_id
 *
 * @param searchTerm - Term to search for
 * @param limit - Max results to return
 * @returns Matching batteries
 */
export async function searchBatteries(
  searchTerm: string,
  limit: number = 10
): Promise<Battery[]> {
  try {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toUpperCase().trim();

    const { data, error } = await supabase
      .from('batteries')
      .select('*')
      .or(`battery_id.ilike.%${term}%,usc_id.ilike.%${term}%`)
      .limit(limit);

    if (error) {
      console.warn('Error searching batteries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('Unexpected error searching batteries:', error);
    return [];
  }
}

/**
 * Get batteries for a specific vehicle
 * Useful for showing which batteries are mapped to a vehicle
 *
 * @param vehicleId - Vehicle ID to find batteries for
 * @returns Batteries mapped to the vehicle
 */
export async function getBatteriesForVehicle(vehicleId: string): Promise<Battery[]> {
  try {
    const { data, error } = await supabase
      .from('batteries')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching batteries for vehicle:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('Unexpected error fetching batteries for vehicle:', error);
    return [];
  }
}

/**
 * Export utility for filtering
 * Helps build filter objects programmatically
 */
export const FilterBuilder = {
  /**
   * Create filter for mapped batteries
   */
  mapped: (): BatteryFilters => ({
    mapped: true
  }),

  /**
   * Create filter for unmapped batteries
   */
  unmapped: (): BatteryFilters => ({
    mapped: false
  }),

  /**
   * Create filter for specific status
   */
  byStatus: (status: 'ACTIVE' | 'MAPPED' | 'UNMAPPED'): BatteryFilters => ({
    status
  }),

  /**
   * Create filter for specific service provider
   */
  byServiceProvider: (provider: 'BATTERY_SMART' | 'OTHER'): BatteryFilters => ({
    service_provider: provider
  }),

  /**
   * Create filter for specific zone
   */
  byZone: (zone: string): BatteryFilters => ({
    zone_id: zone
  }),

  /**
   * Create search filter
   */
  search: (term: string): BatteryFilters => ({
    search: term
  }),

  /**
   * Combine multiple filters
   */
  combine: (...filters: BatteryFilters[]): BatteryFilters => {
    return Object.assign({}, ...filters);
  }
};
