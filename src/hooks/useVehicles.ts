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
      console.log('Loading dummy vehicles...');
      
      // Dummy vehicle data for demonstration
      const dummyVehicles: Vehicle[] = [
        {
          id: '1',
          vehicle_number: 'MH12AB1234',
          make: 'EBlu',
          model: 'Feo',
          color: 'Black',
          chassis_number: 'CH123456789',
          motor_serial_number: 'MS987654321',
          delivery_date: '2024-01-15',
          vendor: 'TechnoElectric Mobility',
          pdi_done_by: 'John Smith',
          registration_received: true,
          insurance_received: true,
          portable_charger_received: true,
          vehicle_type: 'High Speed',
          battery_type: 'Swappable',
          status: 'Deployed',
          rider_id: 'rider_001',
          rider_name: 'Rajesh Kumar',
          rental_start_date: '2024-02-01',
          rental_end_date: '2024-03-01',
          next_maintenance_date: '2024-03-15',
          location: 'Zone A - Central Mumbai',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-01T10:00:00Z'
        },
        {
          id: '2',
          vehicle_number: 'MH12CD5678',
          make: 'Evolet',
          model: 'Polo',
          color: 'White',
          chassis_number: 'CH987654321',
          motor_serial_number: 'MS123456789',
          delivery_date: '2024-01-20',
          vendor: 'GreenTech Solutions',
          pdi_done_by: 'Sarah Johnson',
          registration_received: true,
          insurance_received: false,
          portable_charger_received: true,
          vehicle_type: 'Low Speed',
          battery_type: 'Fixed',
          status: 'Ready for Deployment',
          next_maintenance_date: '2024-03-20',
          location: 'Zone B - Andheri',
          created_at: '2024-01-20T10:00:00Z',
          updated_at: '2024-01-20T10:00:00Z'
        },
        {
          id: '3',
          vehicle_number: 'MH12EF9012',
          make: 'IntuitEV',
          model: 'BanaEV',
          color: 'Blue',
          chassis_number: 'CH555666777',
          motor_serial_number: 'MS111222333',
          delivery_date: '2024-01-25',
          vendor: 'EcoRide Motors',
          pdi_done_by: 'Mike Wilson',
          registration_received: false,
          insurance_received: true,
          portable_charger_received: false,
          vehicle_type: 'High Speed',
          battery_type: 'Swappable',
          status: 'Under Maintenance',
          next_maintenance_date: '2024-02-25',
          location: 'Zone C - Bandra',
          created_at: '2024-01-25T10:00:00Z',
          updated_at: '2024-02-10T10:00:00Z'
        },
        {
          id: '4',
          vehicle_number: 'MH12GH3456',
          make: 'EBlu',
          model: 'Feo',
          color: 'Maroon',
          chassis_number: 'CH444555666',
          motor_serial_number: 'MS777888999',
          delivery_date: '2024-02-01',
          vendor: 'TechnoElectric Mobility',
          pdi_done_by: 'Emily Davis',
          registration_received: true,
          insurance_received: true,
          portable_charger_received: true,
          vehicle_type: 'Low Speed',
          battery_type: 'Fixed',
          status: 'Deployed',
          rider_id: 'rider_002',
          rider_name: 'Priya Sharma',
          rental_start_date: '2024-02-10',
          rental_end_date: '2024-03-10',
          next_maintenance_date: '2024-04-01',
          location: 'Zone D - Powai',
          created_at: '2024-02-01T10:00:00Z',
          updated_at: '2024-02-10T10:00:00Z'
        },
        {
          id: '5',
          vehicle_number: 'MH12IJ7890',
          make: 'Evolet',
          model: 'Polo',
          color: 'Black',
          chassis_number: 'CH333444555',
          motor_serial_number: 'MS666777888',
          delivery_date: '2024-02-05',
          vendor: 'GreenTech Solutions',
          pdi_done_by: 'Robert Brown',
          registration_received: true,
          insurance_received: true,
          portable_charger_received: true,
          vehicle_type: 'High Speed',
          battery_type: 'Swappable',
          status: 'Ready for Deployment',
          next_maintenance_date: '2024-04-05',
          location: 'Zone E - Thane',
          created_at: '2024-02-05T10:00:00Z',
          updated_at: '2024-02-05T10:00:00Z'
        }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVehicles(dummyVehicles);
      console.log('Successfully loaded dummy vehicles:', dummyVehicles.length);
    } catch (err) {
      console.error('Error loading vehicles:', err);
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