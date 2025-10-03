import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleStats {
  total: {
    count: number;
    lowSpeed: number;
    highSpeed: number;
  };
  deployed: {
    count: number;
    lowSpeed: number;
    highSpeed: number;
  };
  readyForDeployment: {
    count: number;
    lowSpeed: number;
    highSpeed: number;
  };
  underMaintenance: {
    count: number;
    lowSpeed: number;
    highSpeed: number;
  };
  activeRentals: {
    count: number;
    utilizationRate: number;
  };
}

export const useVehicleStats = () => {
  const [stats, setStats] = useState<VehicleStats>({
    total: { count: 0, lowSpeed: 0, highSpeed: 0 },
    deployed: { count: 0, lowSpeed: 0, highSpeed: 0 },
    readyForDeployment: { count: 0, lowSpeed: 0, highSpeed: 0 },
    underMaintenance: { count: 0, lowSpeed: 0, highSpeed: 0 },
    activeRentals: { count: 0, utilizationRate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all vehicles with their status and vehicle_type
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('status, vehicle_type, rider_id');

      if (vehiclesError) {
        throw vehiclesError;
      }

      if (!vehicles) {
        throw new Error('No vehicles data received');
      }

      // Calculate statistics
      const total = {
        count: vehicles.length,
        lowSpeed: vehicles.filter(v => v.vehicle_type === 'Low Speed').length,
        highSpeed: vehicles.filter(v => v.vehicle_type === 'High Speed').length
      };

      const deployed = {
        count: vehicles.filter(v => v.status === 'Deployed').length,
        lowSpeed: vehicles.filter(v => v.status === 'Deployed' && v.vehicle_type === 'Low Speed').length,
        highSpeed: vehicles.filter(v => v.status === 'Deployed' && v.vehicle_type === 'High Speed').length
      };

      const readyForDeployment = {
        count: vehicles.filter(v => v.status === 'Ready for Deployment').length,
        lowSpeed: vehicles.filter(v => v.status === 'Ready for Deployment' && v.vehicle_type === 'Low Speed').length,
        highSpeed: vehicles.filter(v => v.status === 'Ready for Deployment' && v.vehicle_type === 'High Speed').length
      };

      const underMaintenance = {
        count: vehicles.filter(v => v.status === 'Under Maintenance').length,
        lowSpeed: vehicles.filter(v => v.status === 'Under Maintenance' && v.vehicle_type === 'Low Speed').length,
        highSpeed: vehicles.filter(v => v.status === 'Under Maintenance' && v.vehicle_type === 'High Speed').length
      };

      // Active rentals are vehicles that are deployed (have a rider assigned)
      const activeRentalsCount = vehicles.filter(v => v.status === 'Deployed' && v.rider_id).length;
      const utilizationRate = total.count > 0 ? Math.round((activeRentalsCount / total.count) * 100) : 0;

      const activeRentals = {
        count: activeRentalsCount,
        utilizationRate
      };

      setStats({
        total,
        deployed,
        readyForDeployment,
        underMaintenance,
        activeRentals
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching vehicle stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicle statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time changes on vehicles table
    const channel = supabase
      .channel('vehicle-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => {
          // Refetch stats whenever vehicles table changes
          fetchStats();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};