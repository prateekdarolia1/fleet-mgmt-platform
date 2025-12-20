#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kkxxnpfwvlbsqvmbirqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q";

console.log("🔌 Testing Supabase Connection...\n");
console.log("URL:", SUPABASE_URL);
console.log("Project ID: kkxxnpfwvlbsqvmbirqa\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    console.log("📊 Fetching table counts...\n");

    // Test each table
    const tables = {
      vehicles: "vehicles",
      riders: "riders",
      payments: "payments",
      rider_ledgers: "rider_ledgers",
      profiles: "profiles",
      user_roles: "user_roles",
      places: "places"
    };

    for (const [name, table] of Object.entries(tables)) {
      const { data, count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${name}: ${count} records`);
      }
    }

    console.log("\n📋 Sample Data Inspection:\n");

    // Get sample vehicles
    console.log("--- VEHICLES TABLE ---");
    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, vehicle_number, make, model, status, rider_name")
      .limit(3);

    if (vehicleError) {
      console.log(`Error: ${vehicleError.message}`);
    } else {
      console.log(`Found ${vehicles?.length || 0} sample vehicles:`);
      vehicles?.forEach(v => {
        console.log(`  - ${v.vehicle_number || 'N/A'}: ${v.make} ${v.model} (Status: ${v.status})`);
      });
    }

    // Get sample riders
    console.log("\n--- RIDERS TABLE ---");
    const { data: riders, error: riderError } = await supabase
      .from("riders")
      .select("id, rider_id, name, phone, status, duty_status")
      .limit(3);

    if (riderError) {
      console.log(`Error: ${riderError.message}`);
    } else {
      console.log(`Found ${riders?.length || 0} sample riders:`);
      riders?.forEach(r => {
        console.log(`  - ${r.rider_id}: ${r.name} (Phone: ${r.phone}, Status: ${r.status})`);
      });
    }

    // Get sample payments
    console.log("\n--- PAYMENTS TABLE ---");
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("id, payment_id, rider_name, amount, status, payment_mode")
      .limit(3);

    if (paymentError) {
      console.log(`Error: ${paymentError.message}`);
    } else {
      console.log(`Found ${payments?.length || 0} sample payments:`);
      payments?.forEach(p => {
        console.log(`  - ${p.payment_id}: ${p.rider_name} - ₹${p.amount} (${p.status})`);
      });
    }

    console.log("\n✨ Connection test completed successfully!\n");

  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();
