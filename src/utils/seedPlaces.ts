import { supabase } from "@/integrations/supabase/client";
import placesData from "../places.json";

export const seedPlacesData = async () => {
  try {
    console.log("Starting to seed places data...");
    
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('places')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.error("Error clearing existing data:", deleteError);
      return { success: false, error: deleteError };
    }

    // Prepare data for insertion
    const formattedData = (placesData as any[]).map((place: any) => ({
      state_or_ut: place.state_or_ut,
      type: place.type,
      cities: place.cities,
      pincodes: place.pincodes
    }));

    // Insert data in batches to avoid potential limits
    const batchSize = 50;
    const totalBatches = Math.ceil(formattedData.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batch = formattedData.slice(start, end);
      
      const { error } = await supabase
        .from('places')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i + 1}:`, error);
        return { success: false, error };
      }
      
      console.log(`Inserted batch ${i + 1}/${totalBatches} (${batch.length} records)`);
    }

    console.log(`Successfully seeded ${formattedData.length} places records!`);
    return { success: true, count: formattedData.length };
    
  } catch (error) {
    console.error("Error seeding places data:", error);
    return { success: false, error };
  }
};