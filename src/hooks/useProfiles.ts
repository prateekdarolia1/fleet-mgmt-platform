import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Types
export type Profile = Tables<'profiles'>;

// Fetch all profiles (admin users)
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Fetch a single profile by ID
export function useProfileById(profileId: string | null) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: async (): Promise<Profile | null> => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!profileId,
  });
}

// Get current user's profile
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ['profile', 'current'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching current user profile:', error);
        throw error;
      }

      return data;
    },
  });
}
