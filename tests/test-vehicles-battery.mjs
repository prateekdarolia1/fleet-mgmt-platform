#!/usr/bin/env node

/**
 * Test suite for vehicles battery API
 * Tests SQL VIEW, query functions, and data integrity
 *
 * Run: npm run test:vehicles-battery
 * Or:  node test-vehicles-battery.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test counters
let passed = 0;
let failed = 0;
let testNumber = 0;

// Helper functions
const log = (message) => console.log(message);
const section = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(`${title}`);
  console.log('='.repeat(60));
};
const test = (description, fn) => {
  testNumber++;
  return fn()
    .then(() => {
      passed++;
      console.log(`✅ Test ${testNumber}: ${description}`);
    })
    .catch((error) => {
      failed++;
      console.log(`❌ Test ${testNumber}: ${description}`);
      console.log(`   Error: ${error.message}`);
    });
};

// Test data
let testVehicleId;
let testBatteryId;

// ============================================================================
// TESTS
// ============================================================================

section('Setup: Create Test Data');

await test('Create test vehicle', async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}`,
      status: 'Ready for Deployment',
      vehicle_type: 'High Speed'
    })
    .select('id')
    .single();

  if (error) throw error;
  testVehicleId = data.id;
});

await test('Create test battery', async () => {
  const { data, error } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'ACTIVE',
      vehicle_id: testVehicleId
    })
    .select('id')
    .single();

  if (error) throw error;
  testBatteryId = data.id;
});

// ============================================================================
section('Test 1: SQL View - vehicles_with_batteries');

await test('View exists and is queryable', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .limit(1);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array response');
});

await test('View includes vehicle fields', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (!data.id) throw new Error('Missing vehicle ID');
  if (!data.vehicle_number) throw new Error('Missing vehicle_number');
  if (!data.vehicle_status) throw new Error('Missing vehicle_status');
});

await test('View includes battery fields', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (!data.hasOwnProperty('battery_id')) throw new Error('Missing battery_id');
  if (!data.hasOwnProperty('battery_identifier')) throw new Error('Missing battery_identifier');
  if (!data.hasOwnProperty('service_provider')) throw new Error('Missing service_provider');
});

await test('View includes battery_mapped computed field', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('battery_mapped')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (typeof data.battery_mapped !== 'boolean') {
    throw new Error('battery_mapped should be boolean');
  }
});

await test('View includes mapped_battery_id convenience field', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('mapped_battery_id')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (!data.hasOwnProperty('mapped_battery_id')) {
    throw new Error('Missing mapped_battery_id');
  }
});

// ============================================================================
section('Test 2: Battery Mapping State Detection');

await test('battery_mapped=true when battery assigned', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('battery_mapped, battery_id')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (data.battery_mapped !== true) throw new Error('Expected battery_mapped=true');
  if (!data.battery_id) throw new Error('Expected battery_id to exist');
});

await test('mapped_battery_id contains battery identifier', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('mapped_battery_id')
    .eq('id', testVehicleId)
    .single();

  if (error) throw error;
  if (!data.mapped_battery_id || data.mapped_battery_id.length < 3) {
    throw new Error('Expected valid mapped_battery_id');
  }
});

// ============================================================================
section('Test 3: Vehicles Without Battery Query');

await test('Query vehicles with battery_id IS NULL', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .is('battery_id', null)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should have battery_mapped=false
  if (data.some(v => v.battery_mapped === true)) {
    throw new Error('Found vehicle with battery_mapped=true in without-battery query');
  }
});

await test('Query vehicles with battery_mapped=false', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('battery_mapped', false)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should have battery_id IS NULL
  if (data.some(v => v.battery_id !== null)) {
    throw new Error('Found vehicle with battery in without-battery query');
  }
});

// ============================================================================
section('Test 4: Vehicles With Battery Query');

await test('Query vehicles with battery_id IS NOT NULL', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .not('battery_id', 'is', null)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should have battery_mapped=true
  if (data.some(v => v.battery_mapped === false)) {
    throw new Error('Found vehicle without battery in with-battery query');
  }
});

await test('Query vehicles with battery_mapped=true', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('battery_mapped', true)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should have battery_id IS NOT NULL
  if (data.some(v => v.battery_id === null)) {
    throw new Error('Found vehicle without battery in with-battery query');
  }
});

// ============================================================================
section('Test 5: Filtering Combinations');

await test('Filter by vehicle_status and battery_mapped', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('vehicle_status', 'Ready for Deployment')
    .eq('battery_mapped', true)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should match both criteria
  if (data.some(v => v.vehicle_status !== 'Ready for Deployment')) {
    throw new Error('Found mismatched vehicle_status');
  }
  if (data.some(v => v.battery_mapped !== true)) {
    throw new Error('Found vehicle without battery');
  }
});

await test('Filter by service_provider', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('service_provider', 'BATTERY_SMART')
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  if (data.some(v => v.service_provider !== 'BATTERY_SMART' && v.battery_id !== null)) {
    throw new Error('Found mismatched service_provider');
  }
});

await test('Filter by zone_id', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .not('zone_id', 'is', null)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;  // Allow no results

  if (data && data.zone_id) {
    const { data: filtered, error: filterError } = await supabase
      .from('vehicles_with_batteries')
      .select('*')
      .eq('zone_id', data.zone_id)
      .limit(5);

    if (filterError) throw filterError;
    if (filtered.some(v => v.zone_id !== data.zone_id)) {
      throw new Error('Found mismatched zone_id');
    }
  }
});

// ============================================================================
section('Test 6: Search Functionality');

await test('Search by vehicle_number (ILIKE)', async () => {
  // Get a vehicle number first
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles_with_batteries')
    .select('vehicle_number')
    .limit(1)
    .single();

  if (vehicleError && vehicleError.code !== 'PGRST116') throw vehicleError;
  if (vehicle && vehicle.vehicle_number) {
    const searchTerm = vehicle.vehicle_number.substring(0, 3);

    const { data, error } = await supabase
      .from('vehicles_with_batteries')
      .select('*')
      .ilike('vehicle_number', `%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    if (data.length === 0) throw new Error('No results for valid search');
  }
});

await test('Search by rider_name (ILIKE)', async () => {
  // Get a rider name first
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles_with_batteries')
    .select('rider_name')
    .not('rider_name', 'is', null)
    .limit(1)
    .single();

  if (vehicleError && vehicleError.code !== 'PGRST116') throw vehicleError;
  if (vehicle && vehicle.rider_name) {
    const searchTerm = vehicle.rider_name.substring(0, 2);

    const { data, error } = await supabase
      .from('vehicles_with_batteries')
      .select('*')
      .ilike('rider_name', `%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    if (data.length === 0) throw new Error('No results for valid search');
  }
});

// ============================================================================
section('Test 7: Pagination');

await test('Pagination with limit and offset', async () => {
  const { data: page1, error: error1 } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .range(0, 9);

  if (error1) throw error1;
  if (page1.length === 0) throw new Error('No results on page 1');

  const { data: page2, error: error2 } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .range(10, 19);

  if (error2) throw error2;

  // Check that pages have different vehicles (if page 2 has data)
  if (page2.length > 0) {
    const page1Ids = new Set(page1.map(v => v.id));
    const page2Ids = page2.map(v => v.id);

    if (page2Ids.some(id => page1Ids.has(id))) {
      throw new Error('Pages have overlapping vehicles');
    }
  }
});

await test('Count with exact option', async () => {
  const { data, count, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) throw error;
  if (typeof count !== 'number') throw new Error('Expected count to be number');
  if (count === 0) throw new Error('No vehicles in database');
});

// ============================================================================
section('Test 8: Sorting');

await test('Sort by vehicle_number ascending', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('vehicle_number')
    .order('vehicle_number', { ascending: true })
    .limit(10);

  if (error) throw error;
  if (data.length < 2) return;  // Skip if not enough data

  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].vehicle_number > data[i + 1].vehicle_number) {
      throw new Error('Not sorted ascending');
    }
  }
});

await test('Sort by vehicle_number descending', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('vehicle_number')
    .order('vehicle_number', { ascending: false })
    .limit(10);

  if (error) throw error;
  if (data.length < 2) return;  // Skip if not enough data

  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].vehicle_number < data[i + 1].vehicle_number) {
      throw new Error('Not sorted descending');
    }
  }
});

await test('Sort by created_at descending', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  if (data.length < 2) return;

  for (let i = 0; i < data.length - 1; i++) {
    const t1 = new Date(data[i].created_at).getTime();
    const t2 = new Date(data[i + 1].created_at).getTime();
    if (t1 < t2) {
      throw new Error('Not sorted descending by created_at');
    }
  }
});

await test('Sort by battery_mapped', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('battery_mapped')
    .order('battery_mapped', { ascending: true })
    .limit(20);

  if (error) throw error;
  if (data.length < 2) return;

  // Should have false values before true values
  let foundTrue = false;
  for (let i = 0; i < data.length; i++) {
    if (data[i].battery_mapped === true) {
      foundTrue = true;
    } else if (foundTrue && data[i].battery_mapped === false) {
      throw new Error('False value after true value in ascending sort');
    }
  }
});

// ============================================================================
section('Test 9: Complex Filtering');

await test('Multiple filters combined', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .eq('vehicle_status', 'Ready for Deployment')
    .eq('battery_mapped', false)
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');

  // All should match both criteria
  if (data.some(v => v.vehicle_status !== 'Ready for Deployment')) {
    throw new Error('Found mismatched vehicle_status');
  }
  if (data.some(v => v.battery_mapped !== false)) {
    throw new Error('Found vehicle with battery');
  }
});

await test('Filter with OR condition (via or method)', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .or("vehicle_status.eq.'Ready for Deployment',vehicle_status.eq.'Deployed'")
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Expected array');
});

// ============================================================================
section('Test 10: Data Integrity');

await test('No NULL values in required vehicle fields', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .limit(10);

  if (error) throw error;

  if (data.some(v => !v.id)) {
    throw new Error('Found vehicle with NULL id');
  }
  if (data.some(v => !v.vehicle_number)) {
    throw new Error('Found vehicle with NULL vehicle_number');
  }
});

await test('Battery fields NULL only when battery_mapped=false', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .limit(50);

  if (error) throw error;

  for (const vehicle of data) {
    if (vehicle.battery_mapped === true) {
      if (vehicle.battery_id === null) {
        throw new Error('Vehicle with battery_mapped=true has NULL battery_id');
      }
    } else {
      if (vehicle.battery_id !== null) {
        throw new Error('Vehicle with battery_mapped=false has battery_id');
      }
    }
  }
});

await test('battery_mapped matches battery_id IS NOT NULL', async () => {
  const { data, error } = await supabase
    .from('vehicles_with_batteries')
    .select('*')
    .limit(50);

  if (error) throw error;

  for (const vehicle of data) {
    const hasBattery = vehicle.battery_id !== null;
    if (vehicle.battery_mapped !== hasBattery) {
      throw new Error('battery_mapped does not match battery_id presence');
    }
  }
});

// ============================================================================
section('Cleanup: Remove Test Data');

await test('Delete test battery', async () => {
  const { error } = await supabase
    .from('batteries')
    .delete()
    .eq('id', testBatteryId);

  if (error) throw error;
});

await test('Delete test vehicle', async () => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', testVehicleId);

  if (error) throw error;
});

// ============================================================================
// Summary
// ============================================================================

section('Test Summary');
const total = passed + failed;
const percentage = Math.round((passed / total) * 100);

console.log(`
Total Tests: ${total}
Passed: ${passed} ✅
Failed: ${failed} ❌
Success Rate: ${percentage}%
`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed`);
  process.exit(1);
}
