/**
 * CL87 Battery Smart Data Sync Utility
 *
 * This utility syncs vehicle-battery-driver mappings from the CL87 CSV file
 * to Supabase. CSV data takes PRECEDENCE over Supabase data when there are conflicts.
 *
 * Usage:
 *   import { syncCL87Data } from '@/lib/sync/cl87Sync';
 *   const result = await syncCL87Data();
 */

import { supabase } from '@/integrations/supabase/client';

export interface CL87Mapping {
  vehicle_id: string;
  driver_id: string;
  battery_id: string;
  chassis_number: string;
  zone_id: string;
  usc_id: string;
  make_model: string;
  speed_type: string;
  deployment_date: string;
}

export interface SyncResult {
  success: boolean;
  totalRecords: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ record: CL87Mapping; error: string }>;
  conflicts: Array<{ record: CL87Mapping; supabaseData: any; resolution: string }>;
}

/**
 * Parse CL87 CSV data
 */
export function parseCL87CSV(csvContent: string): CL87Mapping[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const mappings: CL87Mapping[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, '').replace(/\r/g, ''));

    const mapping: CL87Mapping = {
      vehicle_id: values[4] || '', // Vehicle ID
      driver_id: values[5] || '',   // Driver ID
      battery_id: values[6] || '',  // Battery ID
      chassis_number: values[3] || '', // Chassis Number
      zone_id: values[8] || '',     // Zone ID
      usc_id: values[10] || '',     // USC ID
      make_model: values[1] || '',  // Vehicle Make & Model
      speed_type: values[2] || '',  // High/Low Speed
      deployment_date: values[7] || '' // Battery Deployment Date
    };

    // Only include valid mappings
    if (mapping.vehicle_id && mapping.driver_id && mapping.battery_id) {
      mappings.push(mapping);
    }
  }

  return mappings;
}

/**
 * Fetch current Supabase data for comparison
 */
async function fetchSupabaseData() {
  // Fetch all vehicles
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, vehicle_number, battery_id, rider_id, rider_name, chassis_number, status');

  if (vehiclesError) throw new Error(`Failed to fetch vehicles: ${vehiclesError.message}`);

  // Fetch all batteries
  const { data: batteries, error: batteriesError } = await supabase
    .from('batteries')
    .select('id, battery_id, battery_smart_id, vehicle_id, status');

  if (batteriesError) throw new Error(`Failed to fetch batteries: ${batteriesError.message}`);

  // Fetch all riders
  const { data: riders, error: ridersError } = await supabase
    .from('riders')
    .select('id, rider_id, name, vehicle_assigned, battery_smart_id, status, duty_status');

  if (ridersError) throw new Error(`Failed to fetch riders: ${ridersError.message}`);

  return { vehicles: vehicles || [], batteries: batteries || [], riders: riders || [] };
}

/**
 * Sync a single mapping - CSV data takes precedence
 */
async function syncMapping(
  mapping: CL87Mapping,
  supabaseData: Awaited<ReturnType<typeof fetchSupabaseData>>,
  dryRun: boolean = false
): Promise<{ action: 'created' | 'updated' | 'skipped'; details: string; conflict?: any }> {
  const { vehicles, batteries, riders } = supabaseData;

  // Find existing vehicle by vehicle_number
  const existingVehicle = vehicles.find(v =>
    v.vehicle_number === mapping.vehicle_id
  );

  // Find existing battery by battery_id
  const existingBattery = batteries.find(b =>
    b.battery_id === mapping.battery_id
  );

  // Find existing rider by rider_id (driver_id in CSV)
  const existingRider = riders.find(r =>
    r.rider_id === mapping.driver_id
  );

  // CASE 1: All three exist - check for conflicts and update if needed
  if (existingVehicle && existingBattery && existingRider) {
    const conflicts: string[] = [];
    let needsUpdate = false;

    // Check vehicle-battery mapping
    if (existingVehicle.battery_id !== existingBattery.id) {
      conflicts.push(`Vehicle battery_id mismatch: ${existingVehicle.battery_id} -> ${existingBattery.id}`);
      needsUpdate = true;
    }

    // Check vehicle-rider mapping
    if (existingVehicle.rider_id !== mapping.driver_id) {
      conflicts.push(`Vehicle rider_id mismatch: ${existingVehicle.rider_id} -> ${mapping.driver_id}`);
      needsUpdate = true;
    }

    // Check rider-vehicle mapping
    if (existingRider.vehicle_assigned !== mapping.vehicle_id) {
      conflicts.push(`Rider vehicle_assigned mismatch: ${existingRider.vehicle_assigned} -> ${mapping.vehicle_id}`);
      needsUpdate = true;
    }

    // Check rider-battery_smart_id (if we can derive it from battery)
    const batterySmartId = existingBattery.battery_smart_id;
    if (batterySmartId && existingRider.battery_smart_id !== batterySmartId) {
      conflicts.push(`Rider battery_smart_id mismatch: ${existingRider.battery_smart_id} -> ${batterySmartId}`);
      needsUpdate = true;
    }

    if (needsUpdate && !dryRun) {
      // Update vehicle with battery mapping
      await supabase
        .from('vehicles')
        .update({
          battery_id: existingBattery.id,
          rider_id: mapping.driver_id,
          rider_name: existingRider.name
        })
        .eq('id', existingVehicle.id);

      // Update rider with vehicle and battery
      await supabase
        .from('riders')
        .update({
          vehicle_assigned: mapping.vehicle_id,
          battery_smart_id: batterySmartId || existingRider.battery_smart_id
        })
        .eq('id', existingRider.id);

      // Update battery with vehicle mapping
      await supabase
        .from('batteries')
        .update({
          vehicle_id: existingVehicle.id,
          status: 'MAPPED'
        })
        .eq('id', existingBattery.id);

      return {
        action: 'updated',
        details: `Updated mappings for ${mapping.vehicle_id}`,
        conflict: conflicts.length > 0 ? conflicts : undefined
      };
    } else if (needsUpdate) {
      return {
        action: 'updated',
        details: `[DRY RUN] Would update mappings for ${mapping.vehicle_id}`,
        conflict: conflicts.length > 0 ? conflicts : undefined
      };
    }

    return {
      action: 'skipped',
      details: `No changes needed for ${mapping.vehicle_id}`
    };
  }

  // CASE 2: Vehicle exists but battery/rider missing - create links
  if (existingVehicle && (!existingBattery || !existingRider)) {
    if (!dryRun) {
      const updates: any = {};

      if (existingBattery) {
        updates.battery_id = existingBattery.id;
        await supabase
          .from('batteries')
          .update({ vehicle_id: existingVehicle.id, status: 'MAPPED' })
          .eq('id', existingBattery.id);
      }

      if (existingRider) {
        updates.rider_id = mapping.driver_id;
        updates.rider_name = existingRider.name;
        await supabase
          .from('riders')
          .update({ vehicle_assigned: mapping.vehicle_id })
          .eq('id', existingRider.id);
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('vehicles')
          .update(updates)
          .eq('id', existingVehicle.id);
      }
    }

    return {
      action: 'updated',
      details: `[${dryRun ? 'DRY RUN: ' : ''}]Linked missing entities for ${mapping.vehicle_id}`
    };
  }

  // CASE 3: Vehicle doesn't exist - skip (would need to be created in inventory first)
  if (!existingVehicle) {
    return {
      action: 'skipped',
      details: `Vehicle ${mapping.vehicle_id} not found in database - add via inventory first`
    };
  }

  return {
    action: 'skipped',
    details: `Unable to process ${mapping.vehicle_id}`
  };
}

/**
 * Main sync function
 *
 * @param csvContent - Raw CSV content from CL87 file
 * @param dryRun - If true, don't make actual changes
 * @param progressCallback - Optional callback for progress updates
 */
export async function syncCL87Data(
  csvContent?: string,
  dryRun: boolean = false,
  progressCallback?: (progress: { current: number; total: number; message: string }) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    totalRecords: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    conflicts: []
  };

  try {
    // If no CSV content provided, try to read from file
    let mappings: CL87Mapping[];

    if (csvContent) {
      mappings = parseCL87CSV(csvContent);
    } else {
      // Default mappings from known CL87 data
      // This would typically come from a file upload
      throw new Error('CSV content required. Please provide the CL87 CSV data.');
    }

    result.totalRecords = mappings.length;

    // Fetch current Supabase data
    progressCallback?.({ current: 0, total: mappings.length, message: 'Fetching current data...' });
    const supabaseData = await fetchSupabaseData();

    // Process each mapping
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      progressCallback?.({
        current: i + 1,
        total: mappings.length,
        message: `Processing ${mapping.vehicle_id}...`
      });

      try {
        const syncResult = await syncMapping(mapping, supabaseData, dryRun);

        switch (syncResult.action) {
          case 'created':
            result.created++;
            break;
          case 'updated':
            result.updated++;
            if (syncResult.conflict) {
              result.conflicts.push({
                record: mapping,
                supabaseData: syncResult.conflict,
                resolution: 'CSV data applied (takes precedence)'
              });
            }
            break;
          case 'skipped':
            result.skipped++;
            break;
        }
      } catch (error) {
        result.errors.push({
          record: mapping,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push({
      record: {} as CL87Mapping,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return result;
  }
}

/**
 * Get sync preview - shows what would change without making changes
 */
export async function previewCL87Sync(csvContent: string): Promise<{
  mappings: CL87Mapping[];
  supabaseSummary: {
    vehicles: number;
    batteries: number;
    riders: number;
  };
  potentialChanges: Array<{
    vehicle_id: string;
    type: 'create' | 'update' | 'conflict';
    details: string;
  }>;
}> {
  const mappings = parseCL87CSV(csvContent);
  const supabaseData = await fetchSupabaseData();

  const potentialChanges: Array<{
    vehicle_id: string;
    type: 'create' | 'update' | 'conflict';
    details: string;
  }> = [];

  for (const mapping of mappings) {
    const existingVehicle = supabaseData.vehicles.find(v => v.vehicle_number === mapping.vehicle_id);
    const existingBattery = supabaseData.batteries.find(b => b.battery_id === mapping.battery_id);
    const existingRider = supabaseData.riders.find(r => r.rider_id === mapping.driver_id);

    if (!existingVehicle) {
      potentialChanges.push({
        vehicle_id: mapping.vehicle_id,
        type: 'create',
        details: `Vehicle not found - needs to be added to inventory`
      });
    } else if (!existingBattery) {
      potentialChanges.push({
        vehicle_id: mapping.vehicle_id,
        type: 'create',
        details: `Battery ${mapping.battery_id} not found - needs to be added to inventory`
      });
    } else if (!existingRider) {
      potentialChanges.push({
        vehicle_id: mapping.vehicle_id,
        type: 'create',
        details: `Rider ${mapping.driver_id} not found - needs to be added`
      });
    } else {
      // Check for conflicts
      const conflicts: string[] = [];

      if (existingVehicle.battery_id !== existingBattery.id) {
        conflicts.push(`battery mapping differs`);
      }
      if (existingVehicle.rider_id !== mapping.driver_id) {
        conflicts.push(`rider assignment differs`);
      }
      if (existingRider.vehicle_assigned !== mapping.vehicle_id) {
        conflicts.push(`rider's vehicle differs`);
      }

      if (conflicts.length > 0) {
        potentialChanges.push({
          vehicle_id: mapping.vehicle_id,
          type: 'conflict',
          details: `Conflicts found: ${conflicts.join(', ')} - CSV will take precedence`
        });
      } else {
        potentialChanges.push({
          vehicle_id: mapping.vehicle_id,
          type: 'update',
          details: `Already synced - no changes needed`
        });
      }
    }
  }

  return {
    mappings,
    supabaseSummary: {
      vehicles: supabaseData.vehicles.length,
      batteries: supabaseData.batteries.length,
      riders: supabaseData.riders.length
    },
    potentialChanges
  };
}

/**
 * Generate SQL statements for direct database injection
 * CSV data takes PRECEDENCE - this will overwrite existing mappings
 */
export async function generateCL87SQL(csvContent: string): Promise<{
  sql: string;
  summary: {
    total: number;
    updates: number;
    skipped: number;
    missing: { vehicles: string[]; batteries: string[]; riders: string[] };
  };
}> {
  const mappings = parseCL87CSV(csvContent);
  const supabaseData = await fetchSupabaseData();

  const sqlLines: string[] = [];
  const missing = { vehicles: [] as string[], batteries: [] as string[], riders: [] as string[] };
  let updates = 0;
  let skipped = 0;

  sqlLines.push('-- CL87 Battery Smart Data Sync SQL');
  sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
  sqlLines.push(`-- Total mappings: ${mappings.length}`);
  sqlLines.push('-- CSV data takes PRECEDENCE over existing data');
  sqlLines.push('');
  sqlLines.push('BEGIN;');
  sqlLines.push('');

  for (const mapping of mappings) {
    const existingVehicle = supabaseData.vehicles.find(v => v.vehicle_number === mapping.vehicle_id);
    const existingBattery = supabaseData.batteries.find(b => b.battery_id === mapping.battery_id);
    const existingRider = supabaseData.riders.find(r => r.rider_id === mapping.driver_id);

    // Track missing entities
    if (!existingVehicle) {
      missing.vehicles.push(mapping.vehicle_id);
      skipped++;
      sqlLines.push(`-- SKIP: Vehicle ${mapping.vehicle_id} not found in database`);
      continue;
    }
    if (!existingBattery) {
      missing.batteries.push(mapping.battery_id);
      skipped++;
      sqlLines.push(`-- SKIP: Battery ${mapping.battery_id} not found in database`);
      continue;
    }
    if (!existingRider) {
      missing.riders.push(mapping.driver_id);
      skipped++;
      sqlLines.push(`-- SKIP: Rider ${mapping.driver_id} not found in database`);
      continue;
    }

    // Generate UPDATE statements
    sqlLines.push(`-- Mapping: ${mapping.vehicle_id} -> ${mapping.driver_id} -> ${mapping.battery_id}`);

    // Update vehicle with battery and rider
    sqlLines.push(`UPDATE vehicles SET`);
    sqlLines.push(`  battery_id = '${existingBattery.id}',`);
    sqlLines.push(`  rider_id = '${mapping.driver_id}',`);
    sqlLines.push(`  rider_name = '${existingRider.name.replace(/'/g, "''")}'`);
    sqlLines.push(`WHERE vehicle_number = '${mapping.vehicle_id}';`);
    sqlLines.push('');

    // Update rider with vehicle and battery_smart_id
    const batterySmartId = existingBattery.battery_smart_id;
    sqlLines.push(`UPDATE riders SET`);
    sqlLines.push(`  vehicle_assigned = '${mapping.vehicle_id}'${batterySmartId ? ',' : ''}`);
    if (batterySmartId) {
      sqlLines.push(`  battery_smart_id = '${batterySmartId}'`);
    }
    sqlLines.push(`WHERE rider_id = '${mapping.driver_id}';`);
    sqlLines.push('');

    // Update battery with vehicle mapping
    sqlLines.push(`UPDATE batteries SET`);
    sqlLines.push(`  vehicle_id = '${existingVehicle.id}',`);
    sqlLines.push(`  status = 'MAPPED'`);
    sqlLines.push(`WHERE battery_id = '${mapping.battery_id}';`);
    sqlLines.push('');

    updates++;
  }

  sqlLines.push('COMMIT;');

  return {
    sql: sqlLines.join('\n'),
    summary: {
      total: mappings.length,
      updates,
      skipped,
      missing
    }
  };
}