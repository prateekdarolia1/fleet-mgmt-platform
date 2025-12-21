import { useQuery } from '@tanstack/react-query';
import {
  listBatteries,
  getBatteryStatusCounts,
  getAvailableZones,
  getAvailableServiceProviders,
  searchBatteries,
  type BatteryFilters,
  type BatteryListResult
} from '@/lib/batteries/listBatteries';

/**
 * Hook for fetching and managing battery listings
 *
 * Features:
 * - Automatic pagination
 * - Real-time filtering
 * - Statistics caching
 * - Status counts
 * - Search capabilities
 *
 * @param filters - Initial filters
 * @param options - Query options
 * @returns Query result with batteries, pagination, and stats
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { data, isLoading, error } = useBatteriesList();
 *
 * // With filters
 * const { data, isLoading } = useBatteriesList({
 *   status: 'ACTIVE',
 *   page: 1,
 *   limit: 20
 * });
 *
 * // With search
 * const { data, isLoading } = useBatteriesList({
 *   search: 'BAT',
 *   page: 1
 * });
 * ```
 */
export function useBatteriesList(
  filters: BatteryFilters = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['batteries', filters],
    queryFn: () => listBatteries(filters),
    staleTime: 1000 * 60, // 1 minute
    enabled: options.enabled !== false
  });
}

/**
 * Hook for battery statistics
 *
 * @returns Query result with status counts
 *
 * @example
 * ```typescript
 * const { data: stats } = useBatteryStats();
 * console.log(`Total: ${stats?.total}, Active: ${stats?.active}`);
 * ```
 */
export function useBatteryStats() {
  return useQuery({
    queryKey: ['battery-stats'],
    queryFn: getBatteryStatusCounts,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

/**
 * Hook for available zones (for filter dropdowns)
 *
 * @returns Query result with list of zones
 *
 * @example
 * ```typescript
 * const { data: zones } = useAvailableZones();
 * // Use in dropdown: zones?.map(z => <option>{z}</option>)
 * ```
 */
export function useAvailableZones() {
  return useQuery({
    queryKey: ['battery-zones'],
    queryFn: getAvailableZones,
    staleTime: 1000 * 60 * 10 // 10 minutes
  });
}

/**
 * Hook for available service providers (for filter dropdowns)
 *
 * @returns Query result with list of service providers
 *
 * @example
 * ```typescript
 * const { data: providers } = useAvailableServiceProviders();
 * ```
 */
export function useAvailableServiceProviders() {
  return useQuery({
    queryKey: ['battery-providers'],
    queryFn: getAvailableServiceProviders,
    staleTime: 1000 * 60 * 10 // 10 minutes
  });
}

/**
 * Hook for battery search
 *
 * @param searchTerm - Search term
 * @param enabled - Whether to execute search
 * @returns Query result with matching batteries
 *
 * @example
 * ```typescript
 * const [searchTerm, setSearchTerm] = useState('');
 * const { data: results } = useBatterySearch(searchTerm, !!searchTerm);
 * ```
 */
export function useBatterySearch(searchTerm: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['battery-search', searchTerm],
    queryFn: () => searchBatteries(searchTerm, 20),
    staleTime: 1000 * 30, // 30 seconds
    enabled: enabled && !!searchTerm?.trim()
  });
}

/**
 * Composite hook for battery table with filters
 * Combines batteries list, stats, and filter options
 *
 * @param filters - Initial filters
 * @returns Combined query results
 *
 * @example
 * ```typescript
 * const {
 *   batteries,
 *   isLoading,
 *   stats,
 *   zones,
 *   providers,
 *   pagination
 * } = useBatteriesTable({ status: 'ACTIVE', page: 1 });
 *
 * if (isLoading) return <LoadingSpinner />;
 *
 * return (
 *   <div>
 *     <p>Total: {stats.total}</p>
 *     <table>
 *       <tbody>
 *         {batteries.map(b => (
 *           <tr key={b.id}>
 *             <td>{b.battery_id}</td>
 *             <td>{b.status}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *     <Pagination page={pagination.page} totalPages={pagination.totalPages} />
 *   </div>
 * );
 * ```
 */
export function useBatteriesTable(filters: BatteryFilters = {}) {
  const batteriesQuery = useBatteriesList(filters);
  const statsQuery = useBatteryStats();
  const zonesQuery = useAvailableZones();
  const providersQuery = useAvailableServiceProviders();

  return {
    // Batteries data
    batteries: batteriesQuery.data?.batteries || [],
    isLoading: batteriesQuery.isLoading,
    error: batteriesQuery.error,

    // Pagination
    pagination: {
      page: batteriesQuery.data?.page || 1,
      limit: batteriesQuery.data?.limit || 10,
      total: batteriesQuery.data?.total || 0,
      totalPages: batteriesQuery.data?.totalPages || 0,
      hasMore: batteriesQuery.data?.hasMore || false
    },

    // Statistics
    stats: statsQuery.data || {
      active: 0,
      mapped: 0,
      unmapped: 0,
      total: 0
    },
    statsLoading: statsQuery.isLoading,

    // Filter options
    zones: zonesQuery.data || [],
    providers: providersQuery.data || [],
    filtersLoading: zonesQuery.isLoading || providersQuery.isLoading,

    // Refetch
    refetch: batteriesQuery.refetch
  };
}
