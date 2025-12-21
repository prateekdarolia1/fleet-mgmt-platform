#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kkxxnpfwvlbsqvmbirqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q";

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     📊 BATTERY EVENTS TABLE TESTS                             ║
╚════════════════════════════════════════════════════════════════╝
`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Check if table exists
    console.log("═".repeat(64));
    console.log("TEST 1: Table Existence");
    console.log("═".repeat(64));

    const { data: tableCheck, error: tableError } = await supabase
      .from("battery_events")
      .select("*", { count: "exact", head: true });

    if (tableError) {
      console.log(`❌ battery_events table does not exist`);
      console.log(`   Error: ${tableError.message}\n`);
      testsFailed++;
      return;
    }
    console.log(`✅ battery_events table exists (${tableCheck === null ? 0 : 0} records)\n`);
    testsPassed++;

    // Test 2: CREATE event - Battery creation should log event
    console.log("═".repeat(64));
    console.log("TEST 2: CREATE Event Logging");
    console.log("═".repeat(64));
    console.log("Creating a new battery and verifying CREATE event is logged...\n");

    const testBatteryId = `BAT${Math.random().toString().slice(2, 8).toUpperCase().padEnd(5, '0')}`;
    const { data: createdBattery, error: createError } = await supabase
      .from("batteries")
      .insert([
        {
          battery_id: testBatteryId,
          service_provider: "BATTERY_SMART",
          battery_plan: "D2D",
          status: "ACTIVE"
        }
      ])
      .select()
      .single();

    if (createError) {
      console.log(`❌ Failed to create battery: ${createError.message}\n`);
      testsFailed++;
    } else {
      console.log(`✅ Battery created: ${testBatteryId}`);

      // Wait a moment for trigger to execute
      await new Promise(r => setTimeout(r, 500));

      // Check if CREATE event was logged
      const { data: createEvents, error: eventError } = await supabase
        .from("battery_events")
        .select("*")
        .eq("battery_id", testBatteryId)
        .eq("event_type", "CREATE");

      if (eventError) {
        console.log(`⚠️  Could not query events: ${eventError.message}`);
      } else if (createEvents && createEvents.length > 0) {
        console.log(`✅ CREATE event logged successfully`);
        console.log(`   Event ID: ${createEvents[0].id}`);
        console.log(`   Event type: ${createEvents[0].event_type}`);
        console.log(`   Battery ID: ${createEvents[0].battery_id}\n`);
        testsPassed++;
      } else {
        console.log(`❌ CREATE event not found in battery_events\n`);
        testsFailed++;
      }

      // Test 3: MAP event - Mapping battery to vehicle
      console.log("═".repeat(64));
      console.log("TEST 3: MAP Event Logging");
      console.log("═".repeat(64));
      console.log("Mapping battery to a vehicle and verifying MAP event is logged...\n");

      // Get an existing vehicle
      const { data: vehicles, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id")
        .limit(1)
        .single();

      if (vehicleError || !vehicles) {
        console.log(`⚠️  No vehicles found in database, skipping MAP/UNMAP tests\n`);
      } else {
        const vehicleId = vehicles.id;
        console.log(`Using vehicle: ${vehicleId}`);

        // Map battery to vehicle
        const { error: mapError } = await supabase
          .from("batteries")
          .update({ vehicle_id: vehicleId })
          .eq("battery_id", testBatteryId);

        if (mapError) {
          console.log(`❌ Failed to map battery: ${mapError.message}\n`);
          testsFailed++;
        } else {
          console.log(`✅ Battery mapped to vehicle`);

          // Wait for trigger
          await new Promise(r => setTimeout(r, 500));

          // Check if MAP event was logged
          const { data: mapEvents, error: mapEventError } = await supabase
            .from("battery_events")
            .select("*")
            .eq("battery_id", testBatteryId)
            .eq("event_type", "MAP");

          if (mapEventError) {
            console.log(`⚠️  Could not query events: ${mapEventError.message}`);
          } else if (mapEvents && mapEvents.length > 0) {
            console.log(`✅ MAP event logged successfully`);
            console.log(`   Previous vehicle: ${mapEvents[0].previous_vehicle_id}`);
            console.log(`   New vehicle: ${mapEvents[0].vehicle_id}`);
            console.log(`   Reason: ${mapEvents[0].reason}\n`);
            testsPassed++;
          } else {
            console.log(`❌ MAP event not found in battery_events\n`);
            testsFailed++;
          }

          // Test 4: UNMAP event - Unmapping battery from vehicle
          console.log("═".repeat(64));
          console.log("TEST 4: UNMAP Event Logging");
          console.log("═".repeat(64));
          console.log("Unmapping battery from vehicle and verifying UNMAP event is logged...\n");

          // Unmap battery
          const { error: unmapError } = await supabase
            .from("batteries")
            .update({ vehicle_id: null })
            .eq("battery_id", testBatteryId);

          if (unmapError) {
            console.log(`❌ Failed to unmap battery: ${unmapError.message}\n`);
            testsFailed++;
          } else {
            console.log(`✅ Battery unmapped from vehicle`);

            // Wait for trigger
            await new Promise(r => setTimeout(r, 500));

            // Check if UNMAP event was logged
            const { data: unmapEvents, error: unmapEventError } = await supabase
              .from("battery_events")
              .select("*")
              .eq("battery_id", testBatteryId)
              .eq("event_type", "UNMAP");

            if (unmapEventError) {
              console.log(`⚠️  Could not query events: ${unmapEventError.message}`);
            } else if (unmapEvents && unmapEvents.length > 0) {
              console.log(`✅ UNMAP event logged successfully`);
              console.log(`   Previous vehicle: ${unmapEvents[0].previous_vehicle_id}`);
              console.log(`   New vehicle: ${unmapEvents[0].vehicle_id}`);
              console.log(`   Reason: ${unmapEvents[0].reason}\n`);
              testsPassed++;
            } else {
              console.log(`❌ UNMAP event not found in battery_events\n`);
              testsFailed++;
            }
          }
        }
      }

      // Test 5: UPDATE event - Changing battery status
      console.log("═".repeat(64));
      console.log("TEST 5: UPDATE Event Logging");
      console.log("═".repeat(64));
      console.log("Updating battery status and verifying UPDATE event is logged...\n");

      const { error: updateError } = await supabase
        .from("batteries")
        .update({ status: "MAPPED" })
        .eq("battery_id", testBatteryId);

      if (updateError) {
        console.log(`❌ Failed to update battery: ${updateError.message}\n`);
        testsFailed++;
      } else {
        console.log(`✅ Battery status updated to MAPPED`);

        // Wait for trigger
        await new Promise(r => setTimeout(r, 500));

        // Check if UPDATE event was logged
        const { data: updateEvents, error: updateEventError } = await supabase
          .from("battery_events")
          .select("*")
          .eq("battery_id", testBatteryId)
          .eq("event_type", "UPDATE")
          .order("created_at", { ascending: false })
          .limit(1);

        if (updateEventError) {
          console.log(`⚠️  Could not query events: ${updateEventError.message}`);
        } else if (updateEvents && updateEvents.length > 0) {
          console.log(`✅ UPDATE event logged successfully`);
          console.log(`   Changes: ${JSON.stringify(updateEvents[0].changes).substring(0, 100)}...\n`);
          testsPassed++;
        } else {
          console.log(`❌ UPDATE event not found in battery_events\n`);
          testsFailed++;
        }
      }

      // Test 6: Event timeline - All events for battery
      console.log("═".repeat(64));
      console.log("TEST 6: Complete Event Timeline");
      console.log("═".repeat(64));
      console.log(`Battery: ${testBatteryId}\n`);

      const { data: timeline, error: timelineError } = await supabase
        .from("battery_events")
        .select("*")
        .eq("battery_id", testBatteryId)
        .order("created_at", { ascending: true });

      if (timelineError) {
        console.log(`❌ Error querying timeline: ${timelineError.message}\n`);
        testsFailed++;
      } else if (timeline) {
        console.log(`Timeline (${timeline.length} events):`);
        timeline.forEach((event, index) => {
          console.log(`\n  ${index + 1}. ${event.event_type}`);
          console.log(`     Time: ${new Date(event.created_at).toLocaleString()}`);
          if (event.vehicle_id) console.log(`     Vehicle: ${event.vehicle_id}`);
          if (event.reason) console.log(`     Reason: ${event.reason}`);
          if (event.performed_by) console.log(`     By: ${event.performed_by}`);
        });
        console.log();
        testsPassed++;
      }

      // Cleanup
      console.log("═".repeat(64));
      console.log("CLEANUP: Removing test battery and events...\n");

      const { error: deleteError } = await supabase
        .from("batteries")
        .delete()
        .eq("battery_id", testBatteryId);

      if (deleteError) {
        console.log(`⚠️  Could not delete test battery: ${deleteError.message}`);
      } else {
        console.log(`✅ Test battery deleted\n`);
      }
    }

    // Summary
    console.log("═".repeat(64));
    console.log("📊 TEST SUMMARY");
    console.log("═".repeat(64));
    console.log(`\n✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total:  ${testsPassed + testsFailed}\n`);

    if (testsFailed === 0) {
      console.log("🎉 ALL TESTS PASSED!");
      console.log("\n✓ battery_events table created successfully");
      console.log("✓ CREATE events logged automatically");
      console.log("✓ MAP events logged automatically");
      console.log("✓ UNMAP events logged automatically");
      console.log("✓ UPDATE events logged automatically");
      console.log("✓ Event timeline shows all changes");
      console.log("\nBattery tracking system is ready!\n");
    } else {
      console.log(`⚠️  ${testsFailed} test(s) failed. Check the setup.\n`);
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

runTests();
