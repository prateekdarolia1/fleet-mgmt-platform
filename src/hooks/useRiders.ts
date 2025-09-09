import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Rider {
  id: string;
  rider_id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicle_assigned?: string;
  rental_plan: 'daily' | 'weekly' | 'monthly';
  join_date: string;
  last_payment_date?: string;
  license_document: boolean;
  aadhar_document: boolean;
  agreement_document: boolean;
  address: string;
  created_at: string;
  updated_at: string;
}

export const useRiders = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (err) {
      console.error('Error fetching riders:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addRider = async (riderData: {
    name: string;
    phone: string;
    email: string;
    address: string;
    rental_plan: 'daily' | 'weekly' | 'monthly';
    join_date: string;
  }) => {
    try {
      // Generate rider ID
      const { data: existingRiders } = await supabase
        .from('riders')
        .select('rider_id')
        .like('rider_id', 'R%');

      const existingNumbers = (existingRiders || [])
        .map(r => r.rider_id)
        .filter(id => id.startsWith('R'))
        .map(id => parseInt(id.substring(1)))
        .filter(num => !isNaN(num));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const riderId = `R${nextNumber.toString().padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('riders')
        .insert([{
          ...riderData,
          rider_id: riderId,
          status: 'active' as const,
          license_document: false,
          aadhar_document: false,
          agreement_document: false
        }])
        .select()
        .single();

      if (error) throw error;

      setRiders(prev => [data, ...prev]);
      toast.success(`Rider ${riderId} added successfully!`);
      return data;
    } catch (err) {
      console.error('Error adding rider:', err);
      toast.error('Failed to add rider');
      throw err;
    }
  };

  const updateRider = async (id: string, updates: Partial<Rider>) => {
    try {
      const { data, error } = await supabase
        .from('riders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRiders(prev => prev.map(rider => 
        rider.id === id ? { ...rider, ...data } : rider
      ));

      toast.success('Rider updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating rider:', err);
      toast.error('Failed to update rider');
      throw err;
    }
  };

  const deleteRider = async (id: string) => {
    try {
      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRiders(prev => prev.filter(rider => rider.id !== id));
      toast.success('Rider removed successfully!');
    } catch (err) {
      console.error('Error deleting rider:', err);
      toast.error('Failed to remove rider');
      throw err;
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  return {
    riders,
    loading,
    error,
    addRider,
    updateRider,
    deleteRider,
    refetch: fetchRiders
  };
};