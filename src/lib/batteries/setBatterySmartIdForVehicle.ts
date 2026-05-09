import { supabase } from '@/integrations/supabase/client';

export interface SetBatterySmartIdResult {
  success: boolean;
  error?: string;
  rowsUpdated?: number;
}

/**
 * Write a battery_smart_id onto the battery row currently mapped to the given vehicle.
 * The display layer (useVehicles) reads battery_smart_id from the joined batteries row,
 * so this single write surfaces the value everywhere battery_smart_id is shown.
 */
export async function setBatterySmartIdForVehicle(
  vehicleId: string,
  batterySmartId: string
): Promise<SetBatterySmartIdResult> {
  const normalized = batterySmartId.trim().toUpperCase();

  const { data, error } = await supabase
    .from('batteries')
    .update({ battery_smart_id: normalized })
    .eq('vehicle_id', vehicleId)
    .select('id');

  if (error) {
    console.error('setBatterySmartIdForVehicle failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, rowsUpdated: data?.length ?? 0 };
}
