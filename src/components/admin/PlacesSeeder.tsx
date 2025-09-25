import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { seedPlacesData } from "@/utils/seedPlaces";
import { Loader2 } from "lucide-react";

export const PlacesSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const result = await seedPlacesData();
      
      if (result.success) {
        toast.success(`Successfully seeded ${result.count} places records!`);
      } else {
        toast.error("Failed to seed places data. Check console for details.");
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("An error occurred while seeding places data.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Places Data Seeder</CardTitle>
        <CardDescription>
          Import Indian states, cities, and pincodes data into the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSeedData} 
          disabled={isSeeding}
          className="w-full"
        >
          {isSeeding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Seeding Data...
            </>
          ) : (
            "Seed Places Data"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};