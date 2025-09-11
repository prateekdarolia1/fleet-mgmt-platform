import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  color: string;
  chassis_number: string;
  motor_serial_number: string;
  delivery_date: string;
  vendor: string;
  pdi_done_by: string;
  registration_received: boolean;
  insurance_received: boolean;
  portable_charger_received: boolean;
  vehicle_type: 'High Speed' | 'Low Speed';
  battery_type: 'Fixed' | 'Swappable';
  status: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance';
  rider_id?: string;
  rider_name?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  next_maintenance_date: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async (vehicleData: {
    make: string;
    model: string;
    color: string;
    chassis_number: string;
    motor_serial_number: string;
    delivery_date: string;
    vendor: string;
    pdi_done_by: string;
    registration_received: boolean;
    insurance_received: boolean;
    portable_charger_received: boolean;
    vehicle_type: 'High Speed' | 'Low Speed';
    battery_type: 'Fixed' | 'Swappable';
    vehicle_number: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          ...vehicleData,
          status: 'Ready for Deployment' as const,
          next_maintenance_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      setVehicles(prev => [data, ...prev]);
      toast.success(`Vehicle ${vehicleData.vehicle_number} added successfully!`);
      return data;
    } catch (err) {
      console.error('Error adding vehicle:', err);
      toast.error('Failed to add vehicle');
      throw err;
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === id ? { ...vehicle, ...data } : vehicle
      ));

      toast.success(`Vehicle updated successfully!`);
      return data;
    } catch (err) {
      console.error('Error updating vehicle:', err);
      toast.error('Failed to update vehicle');
      throw err;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVehicles(prev => prev.filter(vehicle => vehicle.id !== id));
      toast.success('Vehicle removed successfully!');
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      toast.error('Failed to remove vehicle');
      throw err;
    }
  };

  const toggleVehicleStatus = async (id: string) => {
    try {
      const vehicle = vehicles.find(v => v.id === id);
      if (!vehicle) return;

      const statusOrder: Vehicle['status'][] = ['Ready for Deployment', 'Deployed', 'Under Maintenance'];
      const currentIndex = statusOrder.indexOf(vehicle.status);
      const nextIndex = (currentIndex + 1) % statusOrder.length;
      const newStatus = statusOrder[nextIndex];

      await updateVehicle(id, { status: newStatus });
      toast.success(`Vehicle ${vehicle.vehicle_number} status changed to ${newStatus}`);
    } catch (err) {
      console.error('Error toggling vehicle status:', err);
      toast.error('Failed to update vehicle status');
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    toggleVehicleStatus,
    refetch: fetchVehicles
  };
};