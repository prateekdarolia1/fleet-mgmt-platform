#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kkxxnpfwvlbsqvmbirqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q";

console.log("🔋 Testing Batteries Table...\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testBatteriesTable() {
  try {
    console.log("Querying 'batteries' table...\n");
    
    const { data, count, error } = await supabase
      .from("batteries")
      .select("*", { count: "exact" })
      .limit(10);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log("\n⚠️  The 'batteries' table does not exist in the database.");
      console.log("\n📋 Available tables in the database:");
      console.log("   - vehicles");
      console.log("   - riders");
      console.log("   - payments");
      console.log("   - rider_ledgers");
      console.log("   - profiles");
      console.log("   - user_roles");
      console.log("   - places");
    } else {
      console.log(`✅ Found batteries table with ${count} records:\n`);
      if (data && data.length > 0) {
        console.log("Sample records:");
        data.forEach((record, idx) => {
          console.log(`\n[${idx + 1}]:`, JSON.stringify(record, null, 2));
        });
      } else {
        console.log("No records found in batteries table.");
      }
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testBatteriesTable();
