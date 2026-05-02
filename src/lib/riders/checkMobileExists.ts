import { supabase } from '@/integrations/supabase/client';

export interface MobileExistsResult {
  exists: boolean;
  rider?: { rider_id: string; name: string };
}

export async function checkMobileExists(
  mobileNumber: string,
  excludeRiderRowId?: string
): Promise<MobileExistsResult> {
  const trimmed = mobileNumber.trim();
  if (!/^\d{10}$/.test(trimmed)) return { exists: false };

  let query = supabase
    .from('riders')
    .select('id, rider_id, name')
    .or(`mobile_number.eq.${trimmed},phone.eq.${trimmed}`)
    .limit(1);

  if (excludeRiderRowId) query = query.neq('id', excludeRiderRowId);

  const { data, error } = await query;
  if (error) {
    console.error('checkMobileExists query failed:', error);
    return { exists: false };
  }

  const hit = data?.[0];
  return hit
    ? { exists: true, rider: { rider_id: hit.rider_id, name: hit.name } }
    : { exists: false };
}
