import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkMobileExists } from '@/lib/riders/checkMobileExists';

export interface Rider {
  id: string;
  rider_id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended' | 'deboarded';
  vehicle_assigned?: string | null;
  rental_plan: 'daily' | 'weekly' | 'monthly';
  join_date: string;
  last_payment_date?: string | null;
  license_document: boolean;
  aadhar_document: boolean;
  agreement_document: boolean;
  address: string;
  created_at: string;
  updated_at: string;
  
  // Section 1: Personal Information - these can be null from database
  first_name?: string | null;
  last_name?: string | null;
  mobile_number?: string | null;
  dob?: string | null;
  aadhaar_number?: string | null;
  pan_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address_google_link?: string | null;
  marital_status?: string | null;
  dependent_name?: string | null;
  dependent_relation?: string | null;
  dependent_aadhaar?: string | null;

  // Section 2: Employment Information - these can be null from database
  aggregator?: string | null;
  aggregator_other?: string | null;
  aggregator_id?: string | null;
  joined_since?: string | null;
  avg_earnings_15_days?: number | null;
  
  // Section 3: Office Use - these can be null from database
  onboarded_by?: string | null;
  aggregator_credentials_checked?: boolean;
  id_credentials_checked?: boolean;
  retained_document_details?: string | null;
  
  // New status field
  duty_status?: string | null;

  // Vehicle swap tracking — when a swap is open, original_vehicle_assigned
  // holds the rider's real (broken) vehicle and vehicle_assigned points to the temp.
  original_vehicle_assigned?: string | null;
  swapped_at?: string | null;

  // Historical tracking fields
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  is_historical_import?: boolean;
  data_source?: string;
  import_batch_id?: string | null;
  confidence_score?: number;
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
      setRiders(data as Rider[] || []);
    } catch (err) {
      console.error('Error fetching riders:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addRider = async (riderData: {
    // Section 1: Personal Information
    first_name: string;
    last_name?: string;
    mobile_number: string;
    dob: string;
    aadhaar_number: string;
    pan_number: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    pincode: string;
    address_google_link: string;
    marital_status: 'SINGLE' | 'MARRIED';
    dependent_name?: string;
    dependent_relation?: 'FATHER' | 'MOTHER' | 'BROTHER' | 'SPOUSE' | 'OTHER';
    dependent_aadhaar?: string;

    // Section 2: Employment Information
    aggregator: 'SWIGGY' | 'ZOMATO' | 'ZEPTO' | 'BLINKIT' | 'BIGBASKET' | 'OTHER';
    aggregator_other?: string;
    aggregator_id: string;
    joined_since: string;
    avg_earnings_15_days: number;

    // Section 3: Office Use
    onboarded_by?: 'TL1' | 'TL2' | null;
    aggregator_credentials_checked: boolean;
    id_credentials_checked: boolean;
    retained_document_details: string;
  }) => {
    try {
      // Block duplicate mobile numbers — DB has no unique constraint yet, so
      // this is the primary guard. Race-safe enough for low-volume admin use.
      const dup = await checkMobileExists(riderData.mobile_number);
      if (dup.exists) {
        throw new Error(
          `Mobile ${riderData.mobile_number} already registered to ${dup.rider?.rider_id} (${dup.rider?.name})`
        );
      }

      // Generate LPR rider ID
      const { data: existingRiders } = await supabase
        .from('riders')
        .select('rider_id')
        .like('rider_id', 'LPR%');

      const existingNumbers = (existingRiders || [])
        .map(r => r.rider_id)
        .filter(id => id.startsWith('LPR'))
        .map(id => parseInt(id.substring(3)))
        .filter(num => !isNaN(num));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const riderId = `LPR${nextNumber.toString().padStart(4, '0')}`;

      // Create full name and legacy fields for compatibility
      const fullName = [riderData.first_name, riderData.last_name].filter(Boolean).join(' ');
      const fullAddress = `${riderData.address_line1}, ${riderData.address_line2}, ${riderData.city}, ${riderData.state} - ${riderData.pincode}`;

      const { data, error } = await supabase
        .from('riders')
        .insert([{
          ...riderData,
          rider_id: riderId,
          name: fullName, // For compatibility
          phone: riderData.mobile_number, // For compatibility
          email: `${riderData.first_name.toLowerCase()}${riderData.last_name ? '.' + riderData.last_name.toLowerCase() : ''}@temp.com`, // Temp email
          address: fullAddress, // For compatibility
          rental_plan: 'daily' as const, // Default
          join_date: new Date().toISOString().split('T')[0], // Today's date
          status: 'active' as const,
          duty_status: 'IDLE' as const,
          license_document: false,
          aadhar_document: false,
          agreement_document: false
        }])
        .select()
        .single();

      if (error) throw error;

      setRiders(prev => [data as Rider, ...prev]);
      toast.success(`Rider ${riderId} added successfully!`);
      return data;
    } catch (err) {
      console.error('Error adding rider:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add rider';
      toast.error(msg);
      throw err;
    }
  };

  const updateRider = async (id: string, updates: Partial<Rider>) => {
    try {
      // Drop undefined values so we don't overwrite stored fields with nulls.
      const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Update legacy fields for compatibility
      if (cleanedUpdates.first_name || cleanedUpdates.last_name) {
        const currentRider = riders.find(r => r.id === id);
        cleanedUpdates.name = `${cleanedUpdates.first_name || currentRider?.first_name || ''} ${cleanedUpdates.last_name || currentRider?.last_name || ''}`.trim();
      }

      if (cleanedUpdates.mobile_number) {
        const currentRider = riders.find(r => r.id === id);
        if (cleanedUpdates.mobile_number !== currentRider?.mobile_number) {
          const dup = await checkMobileExists(cleanedUpdates.mobile_number, id);
          if (dup.exists) {
            throw new Error(
              `Mobile ${cleanedUpdates.mobile_number} already registered to ${dup.rider?.rider_id} (${dup.rider?.name})`
            );
          }
        }
        cleanedUpdates.phone = cleanedUpdates.mobile_number;
      }

      console.log('Updating rider with data:', cleanedUpdates);

      const { data, error } = await supabase
        .from('riders')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      setRiders(prev => prev.map(rider => 
        rider.id === id ? { ...rider, ...data } as Rider : rider
      ));

      toast.success('Rider updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating rider:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rider';
      toast.error(`Update failed: ${errorMessage}`);
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

    // Set up real-time subscription for duty status changes
    const channel = supabase
      .channel('riders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'riders'
        },
        (payload) => {
          console.log('Real-time rider update:', payload);

          if (payload.eventType === 'INSERT') {
            setRiders(prev => [payload.new as Rider, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRiders(prev => prev.map(rider =>
              rider.id === payload.new.id ? { ...rider, ...payload.new } as Rider : rider
            ));
          } else if (payload.eventType === 'DELETE') {
            // Fix: Use id from old payload for deletion
            const deletedId = payload.old?.id;
            if (deletedId) {
              setRiders(prev => prev.filter(rider => rider.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        // Refetch on successful subscription to ensure fresh data
        if (status === 'SUBSCRIBED') {
          fetchRiders();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
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