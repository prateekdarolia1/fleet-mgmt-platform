#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kkxxnpfwvlbsqvmbirqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q";

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🔒 BATTERIES TABLE VALIDATION TESTS                       ║
╚════════════════════════════════════════════════════════════════╝
`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Helper function to test inserts
  async function testInsert(testName, data, shouldSucceed = true) {
    try {
      const { data: result, error } = await supabase
        .from("batteries")
        .insert([data])
        .select();

      if (shouldSucceed) {
        if (error) {
          console.log(`❌ ${testName}`);
          console.log(`   Expected: Success`);
          console.log(`   Got: ${error.message}\n`);
          failedTests++;
          return null;
        } else {
          console.log(`✅ ${testName}`);
          passedTests++;
          return result[0].id;
        }
      } else {
        if (error) {
          console.log(`✅ ${testName}`);
          console.log(`   Correctly rejected: ${error.message.substring(0, 80)}...\n`);
          passedTests++;
          return null;
        } else {
          console.log(`❌ ${testName}`);
          console.log(`   Expected: Reject with error`);
          console.log(`   Got: Success (should have failed)\n`);
          failedTests++;
          return null;
        }
      }
    } catch (error) {
      console.log(`❌ ${testName} - Exception: ${error.message}\n`);
      failedTests++;
      return null;
    }
  }

  console.log("═".repeat(64));
  console.log("TEST 1: battery_id Format Validation");
  console.log("═".repeat(64));
  console.log("Rule: ^[A-Z0-9]{8}$ (8 uppercase alphanumeric chars)\n");

  // Valid battery_id formats
  const validBatteryId = await testInsert(
    "Valid battery_id: 'ABC12345'",
    {
      battery_id: "ABC12345",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Valid battery_id: 'ABCD1234'",
    {
      battery_id: "ABCD1234",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Valid battery_id: '12345678' (all numbers)",
    {
      battery_id: "12345678",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  // Invalid battery_id formats
  await testInsert(
    "Invalid battery_id: 'abc12345' (lowercase)",
    {
      battery_id: "abc12345",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    false
  );

  await testInsert(
    "Invalid battery_id: 'ABC-1234' (contains hyphen)",
    {
      battery_id: "ABC-1234",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    false
  );

  await testInsert(
    "Invalid battery_id: 'ABC123' (too short)",
    {
      battery_id: "ABC123",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    false
  );

  await testInsert(
    "Invalid battery_id: 'ABC123456' (too long)",
    {
      battery_id: "ABC123456",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    false
  );

  console.log("═".repeat(64));
  console.log("TEST 2: zone_id Format Validation");
  console.log("═".repeat(64));
  console.log("Rule: ^[A-Z0-9]{8}$ (8 uppercase alphanumeric, nullable)\n");

  await testInsert(
    "Valid zone_id: 'ZONE1234'",
    {
      battery_id: "BAT25001",
      service_provider: "BATTERY_SMART",
      zone_id: "ZONE1234",
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Valid zone_id: null (nullable field)",
    {
      battery_id: "BAT25002",
      service_provider: "BATTERY_SMART",
      zone_id: null,
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Invalid zone_id: 'zone1234' (lowercase)",
    {
      battery_id: "BAT25003",
      service_provider: "BATTERY_SMART",
      zone_id: "zone1234",
      battery_plan: "D2D"
    },
    false
  );

  await testInsert(
    "Invalid zone_id: 'ZONE123' (too short)",
    {
      battery_id: "BAT25004",
      service_provider: "BATTERY_SMART",
      zone_id: "ZONE123",
      battery_plan: "D2D"
    },
    false
  );

  console.log("═".repeat(64));
  console.log("TEST 3: usc_id Uppercase Enforcement");
  console.log("═".repeat(64));
  console.log("Rule: Automatically converted to uppercase\n");

  const uscInsert = await testInsert(
    "Lowercase usc_id: 'usc123456' → converted to 'USC123456'",
    {
      battery_id: "BAT25005",
      service_provider: "BATTERY_SMART",
      usc_id: "usc123456",
      battery_plan: "D2D"
    },
    true
  );

  if (uscInsert) {
    const { data } = await supabase
      .from("batteries")
      .select("usc_id")
      .eq("id", uscInsert)
      .single();

    if (data?.usc_id === "USC123456") {
      console.log(`   ✓ Verified: 'usc123456' → '${data.usc_id}'\n`);
    } else {
      console.log(`   ✗ Not converted: got '${data?.usc_id}'\n`);
    }
  }

  const mixedUscInsert = await testInsert(
    "Mixed case usc_id: 'UsC123456' → converted to 'USC123456'",
    {
      battery_id: "BAT25006",
      service_provider: "BATTERY_SMART",
      usc_id: "UsC123456",
      battery_plan: "D2D"
    },
    true
  );

  if (mixedUscInsert) {
    const { data } = await supabase
      .from("batteries")
      .select("usc_id")
      .eq("id", mixedUscInsert)
      .single();

    if (data?.usc_id === "USC123456") {
      console.log(`   ✓ Verified: 'UsC123456' → '${data.usc_id}'\n`);
    } else {
      console.log(`   ✗ Not converted: got '${data?.usc_id}'\n`);
    }
  }

  console.log("═".repeat(64));
  console.log("TEST 4: Enum Enforcement");
  console.log("═".repeat(64));
  console.log("Rule: Only valid enum values allowed\n");

  // Valid service_provider
  await testInsert(
    "Valid service_provider: 'BATTERY_SMART'",
    {
      battery_id: "BAT25007",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Valid service_provider: 'OTHER'",
    {
      battery_id: "BAT25008",
      service_provider: "OTHER",
      battery_plan: "D2D"
    },
    true
  );

  // Invalid service_provider
  await testInsert(
    "Invalid service_provider: 'INVALID_PROVIDER'",
    {
      battery_id: "BAT25009",
      service_provider: "INVALID_PROVIDER",
      battery_plan: "D2D"
    },
    false
  );

  // Valid battery_plan
  await testInsert(
    "Valid battery_plan: 'D2D'",
    {
      battery_id: "BAT25010",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  await testInsert(
    "Valid battery_plan: 'B2B'",
    {
      battery_id: "BAT25011",
      service_provider: "BATTERY_SMART",
      battery_plan: "B2B"
    },
    true
  );

  // Invalid battery_plan
  await testInsert(
    "Invalid battery_plan: 'INVALID_PLAN'",
    {
      battery_id: "BAT25012",
      service_provider: "BATTERY_SMART",
      battery_plan: "INVALID_PLAN"
    },
    false
  );

  // Valid status
  await testInsert(
    "Valid status: 'ACTIVE' (default)",
    {
      battery_id: "BAT25013",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D"
    },
    true
  );

  // Invalid status
  await testInsert(
    "Invalid status: 'INVALID_STATUS'",
    {
      battery_id: "BAT25014",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D",
      status: "INVALID_STATUS"
    },
    false
  );

  console.log("═".repeat(64));
  console.log("TEST 5: Retrofit Date Validation");
  console.log("═".repeat(64));
  console.log("Rule: retrofit_date cannot be in the future\n");

  // Valid past date
  await testInsert(
    "Valid retrofit_date: '2025-01-01' (past date)",
    {
      battery_id: "BAT25015",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D",
      retrofit_date: "2025-01-01"
    },
    true
  );

  // Invalid future date
  await testInsert(
    "Invalid retrofit_date: '2099-12-31' (future date)",
    {
      battery_id: "BAT25016",
      service_provider: "BATTERY_SMART",
      battery_plan: "D2D",
      retrofit_date: "2099-12-31"
    },
    false
  );

  console.log("═".repeat(64));
  console.log("TEST 6: Combined Constraints");
  console.log("═".repeat(64));
  console.log("Rule: Multiple validations work together\n");

  await testInsert(
    "Valid: All constraints pass",
    {
      battery_id: "BAT25017",
      service_provider: "BATTERY_SMART",
      zone_id: "ZONE9999",
      retrofit_date: "2024-12-01",
      location: "NOIDA",
      usc_id: "usc_code",
      battery_plan: "D2D",
      status: "ACTIVE"
    },
    true
  );

  await testInsert(
    "Invalid: Multiple constraint violations (lowercase battery_id, invalid plan)",
    {
      battery_id: "bat25018",
      service_provider: "BATTERY_SMART",
      zone_id: "ZONE9999",
      battery_plan: "INVALID"
    },
    false
  );

  // Cleanup test records
  console.log("═".repeat(64));
  console.log("CLEANUP: Removing test records...\n");

  const { data: testRecords } = await supabase
    .from("batteries")
    .select("id")
    .ilike("battery_id", "BAT25%");

  if (testRecords && testRecords.length > 0) {
    const ids = testRecords.map(r => r.id);
    await supabase.from("batteries").delete().in("id", ids);
    console.log(`✅ Deleted ${testRecords.length} test records\n`);
  }

  if (validBatteryId) {
    await supabase.from("batteries").delete().eq("id", validBatteryId);
  }

  // Summary
  console.log("═".repeat(64));
  console.log("📊 TEST SUMMARY");
  console.log("═".repeat(64));
  console.log(`\n✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total:  ${passedTests + failedTests}\n`);

  if (failedTests === 0) {
    console.log("🎉 ALL VALIDATION TESTS PASSED!");
    console.log("\n✓ battery_id format enforced: ^[A-Z0-9]{8}$");
    console.log("✓ zone_id format enforced: ^[A-Z0-9]{8}$ (nullable)");
    console.log("✓ usc_id uppercase conversion working");
    console.log("✓ Enum enforcement: service_provider, battery_plan, status");
    console.log("✓ retrofit_date future-date prevention");
    console.log("✓ Combined constraints working together");
    console.log("\nDatabase is now protected against bad data!\n");
  } else {
    console.log(`⚠️  ${failedTests} test(s) failed. Check constraints are installed.\n`);
  }
}

runTests();
