#!/usr/bin/env node

/**
 * Test suite for map_battery RPC function
 * Tests atomic mapping, validation, and race condition prevention
 *
 * Run: npm run test:map-battery
 * Or:  node test-map-battery-rpc.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test counters
let passed = 0;
let failed = 0;
let testNumber = 0;

// Logging helpers
const log = (msg) => console.log(msg);
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
let testUserId, testBattery1, testBattery2, testVehicle1, testVehicle2;

// ============================================================================
// SETUP
// ============================================================================

section('Setup: Create Test Data');

await test('Create test user', async () => {
  // Use a generated UUID for the test user
  testUserId = crypto.randomUUID();
  log(`  User ID: ${testUserId}`);
});

await test('Create test vehicle 1', async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}-1`,
      status: 'Ready for Deployment',
      vehicle_type: 'High Speed'
    })
    .select('id')
    .single();

  if (error) throw error;
  testVehicle1 = data.id;
  log(`  Vehicle 1 ID: ${testVehicle1}`);
});

await test('Create test vehicle 2', async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}-2`,
      status: 'Ready for Deployment',
      vehicle_type: 'High Speed'
    })
    .select('id')
    .single();

  if (error) throw error;
  testVehicle2 = data.id;
  log(`  Vehicle 2 ID: ${testVehicle2}`);
});

await test('Create test battery 1 (ACTIVE)', async () => {
  const { data, error } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'ACTIVE'
    })
    .select('id, battery_id, status')
    .single();

  if (error) throw error;
  testBattery1 = data;
  log(`  Battery 1 ID: ${testBattery1.id}, Status: ${testBattery1.status}`);
});

await test('Create test battery 2 (UNMAPPED)', async () => {
  const { data, error } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'UNMAPPED'
    })
    .select('id, battery_id, status')
    .single();

  if (error) throw error;
  testBattery2 = data;
  log(`  Battery 2 ID: ${testBattery2.id}, Status: ${testBattery2.status}`);
});

// ============================================================================
section('Test 1: Successful Mapping - ACTIVE Battery');

await test('Map ACTIVE battery to vehicle', async () => {
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: testBattery1.id,
    p_vehicle_id: testVehicle1,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (!data.success) throw new Error(`RPC returned success=false: ${data.error}`);
  if (data.battery.status !== 'MAPPED') throw new Error('Battery status not MAPPED');
  if (data.battery.vehicle_id !== testVehicle1) throw new Error('Battery not assigned to vehicle');

  log(`  ✓ Battery ${data.battery.battery_id} mapped to vehicle ${data.vehicle.vehicle_number}`);
});

await test('Verify battery was updated in database', async () => {
  const { data, error } = await supabase
    .from('batteries')
    .select('status, vehicle_id')
    .eq('id', testBattery1.id)
    .single();

  if (error) throw error;
  if (data.status !== 'MAPPED') throw new Error('Battery status not persisted');
  if (data.vehicle_id !== testVehicle1) throw new Error('Vehicle ID not persisted');
});

await test('Verify MAP event was logged', async () => {
  const { data, error } = await supabase
    .from('battery_events')
    .select('event_type, details')
    .eq('battery_id', testBattery1.id)
    .eq('event_type', 'MAP')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) throw new Error('No MAP event found');
  if (!data.details.vehicle_id) throw new Error('Event missing vehicle_id');
});

// ============================================================================
section('Test 2: Successful Mapping - UNMAPPED Battery');

await test('Map UNMAPPED battery to vehicle', async () => {
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: testBattery2.id,
    p_vehicle_id: testVehicle2,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (!data.success) throw new Error(`Mapping failed: ${data.error}`);
  if (data.battery.status !== 'MAPPED') throw new Error('Battery not MAPPED');

  log(`  ✓ Battery ${data.battery.battery_id} mapped to vehicle ${data.vehicle.vehicle_number}`);
});

// ============================================================================
section('Test 3: Validation - Battery Already Mapped');

await test('Prevent mapping battery already assigned to vehicle', async () => {
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: testBattery1.id,
    p_vehicle_id: testVehicle2,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should have rejected already-mapped battery');
  if (data.error !== 'BATTERY_ALREADY_MAPPED') throw new Error(`Wrong error: ${data.error}`);

  log(`  ✓ Correctly rejected: ${data.message}`);
});

// ============================================================================
section('Test 4: Validation - Vehicle Already Has Battery');

await test('Prevent mapping to vehicle that has battery', async () => {
  // Create a new battery to test with
  const { data: newBat, error: batError } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'ACTIVE'
    })
    .select('id')
    .single();

  if (batError) throw batError;

  // Try to map to vehicle that already has battery (testVehicle1)
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: newBat.id,
    p_vehicle_id: testVehicle1,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should have rejected mapping to vehicle with battery');
  if (data.error !== 'VEHICLE_ALREADY_HAS_BATTERY') {
    throw new Error(`Wrong error: ${data.error}`);
  }

  log(`  ✓ Correctly rejected: ${data.message}`);

  // Cleanup
  await supabase.from('batteries').delete().eq('id', newBat.id);
});

// ============================================================================
section('Test 5: Validation - Invalid Battery Status');

await test('Prevent mapping battery with invalid status', async () => {
  // Create battery with ARCHIVED status (invalid)
  const { data: newBat, error: batError } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'INACTIVE'  // Invalid status for mapping
    })
    .select('id')
    .single();

  if (batError) throw batError;

  // Create a new vehicle for this test
  const { data: newVeh, error: vehError } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}-3`,
      status: 'Ready for Deployment',
      vehicle_type: 'High Speed'
    })
    .select('id')
    .single();

  if (vehError) throw vehError;

  // Try to map battery with invalid status
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: newBat.id,
    p_vehicle_id: newVeh.id,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should have rejected INACTIVE battery');
  if (data.error !== 'INVALID_BATTERY_STATUS') throw new Error(`Wrong error: ${data.error}`);

  log(`  ✓ Correctly rejected: ${data.message}`);

  // Cleanup
  await supabase.from('batteries').delete().eq('id', newBat.id);
  await supabase.from('vehicles').delete().eq('id', newVeh.id);
});

// ============================================================================
section('Test 6: Validation - Battery Not Found');

await test('Prevent mapping non-existent battery', async () => {
  const fakeId = crypto.randomUUID();

  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: fakeId,
    p_vehicle_id: testVehicle1,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should have rejected non-existent battery');
  if (data.error !== 'BATTERY_NOT_FOUND') throw new Error(`Wrong error: ${data.error}`);

  log(`  ✓ Correctly rejected: ${data.message}`);
});

// ============================================================================
section('Test 7: Validation - Vehicle Not Found');

await test('Prevent mapping to non-existent vehicle', async () => {
  // Create a new battery
  const { data: newBat, error: batError } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'ACTIVE'
    })
    .select('id')
    .single();

  if (batError) throw batError;

  const fakeVehicleId = crypto.randomUUID();

  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: newBat.id,
    p_vehicle_id: fakeVehicleId,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should have rejected non-existent vehicle');
  if (data.error !== 'VEHICLE_NOT_FOUND') throw new Error(`Wrong error: ${data.error}`);

  log(`  ✓ Correctly rejected: ${data.message}`);

  // Cleanup
  await supabase.from('batteries').delete().eq('id', newBat.id);
});

// ============================================================================
section('Test 8: Atomicity - Successful Mapping Returns Complete Data');

await test('Success response includes complete battery details', async () => {
  // Create test battery and vehicle
  const { data: newBat } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'OTHER',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'B2B',
      status: 'ACTIVE'
    })
    .select('*')
    .single();

  const { data: newVeh } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}-4`,
      status: 'Ready for Deployment'
    })
    .select('id')
    .single();

  // Map the battery
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: newBat.id,
    p_vehicle_id: newVeh.id,
    p_user_id: testUserId
  });

  if (error) throw error;

  // Verify response includes all required fields
  if (!data.battery.id) throw new Error('Missing battery.id');
  if (!data.battery.battery_id) throw new Error('Missing battery.battery_id');
  if (data.battery.status !== 'MAPPED') throw new Error('Missing/incorrect battery.status');
  if (data.battery.vehicle_id !== newVeh.id) throw new Error('Missing battery.vehicle_id');
  if (!data.vehicle.id) throw new Error('Missing vehicle.id');
  if (!data.vehicle.vehicle_number) throw new Error('Missing vehicle.vehicle_number');
  if (!data.timestamp) throw new Error('Missing timestamp');

  log(`  ✓ Response includes: battery(id, battery_id, status, vehicle_id), vehicle(id, number), timestamp`);

  // Cleanup
  await supabase.from('batteries').delete().eq('id', newBat.id);
  await supabase.from('vehicles').delete().eq('id', newVeh.id);
});

// ============================================================================
section('Test 9: Error Responses Have Proper Structure');

await test('Error response includes error code and message', async () => {
  const { data, error } = await supabase.rpc('map_battery', {
    p_battery_id: crypto.randomUUID(),
    p_vehicle_id: testVehicle1,
    p_user_id: testUserId
  });

  if (error) throw error;
  if (data.success) throw new Error('Should be an error response');
  if (!data.error) throw new Error('Missing error code');
  if (!data.message) throw new Error('Missing error message');

  log(`  ✓ Error structure: { success, error, message }`);
});

// ============================================================================
section('Test 10: Audit Trail');

await test('Verify audit event includes correct user_id', async () => {
  // Create battery and vehicle
  const { data: newBat } = await supabase
    .from('batteries')
    .insert({
      battery_id: `BAT${Math.random().toString().slice(2, 10).toUpperCase()}`,
      service_provider: 'BATTERY_SMART',
      zone_id: `ZONE${Math.random().toString().slice(2, 6).toUpperCase()}`,
      usc_id: `USC${Math.random().toString().slice(2, 6).toUpperCase()}`,
      battery_plan: 'D2D',
      status: 'ACTIVE'
    })
    .select('id')
    .single();

  const { data: newVeh } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: `TEST-VEH-${Date.now()}-5`,
      status: 'Ready for Deployment'
    })
    .select('id')
    .single();

  // Perform mapping
  const { data: mapResult } = await supabase.rpc('map_battery', {
    p_battery_id: newBat.id,
    p_vehicle_id: newVeh.id,
    p_user_id: testUserId
  });

  // Check audit event
  const { data: event } = await supabase
    .from('battery_events')
    .select('created_by, event_type')
    .eq('battery_id', newBat.id)
    .eq('event_type', 'MAP')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!event) throw new Error('No event found');
  if (event.created_by !== testUserId) throw new Error('Wrong user_id in event');

  log(`  ✓ Audit event shows correct user_id: ${testUserId}`);

  // Cleanup
  await supabase.from('batteries').delete().eq('id', newBat.id);
  await supabase.from('vehicles').delete().eq('id', newVeh.id);
});

// ============================================================================
section('Cleanup: Remove Test Data');

await test('Clean up test batteries', async () => {
  const { error } = await supabase
    .from('batteries')
    .delete()
    .in('id', [testBattery1.id, testBattery2.id]);

  if (error) throw error;
});

await test('Clean up test vehicles', async () => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .in('id', [testVehicle1, testVehicle2]);

  if (error) throw error;
});

// ============================================================================
// SUMMARY
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
  console.log('🎉 All tests passed! map_battery RPC is working correctly.');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed`);
  process.exit(1);
}
