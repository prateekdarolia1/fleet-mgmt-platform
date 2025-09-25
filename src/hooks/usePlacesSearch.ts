import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Fuse from 'fuse.js';

interface PlaceData {
  id: string;
  state_or_ut: string;
  cities: string[];
  pincodes: string[];
}

interface LocationSuggestion {
  pincode?: string;
  city?: string;
  state?: string;
}

export const usePlacesSearch = () => {
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredStates, setFilteredStates] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);

  // Fetch places data on component mount
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*');
        
        if (error) throw error;
        
        // Transform the data to ensure proper typing
        const transformedData: PlaceData[] = (data || []).map(place => ({
          id: place.id,
          state_or_ut: place.state_or_ut,
          cities: Array.isArray(place.cities) 
            ? place.cities.filter((city): city is string => typeof city === 'string')
            : [],
          pincodes: Array.isArray(place.pincodes) 
            ? place.pincodes.filter((pincode): pincode is string => typeof pincode === 'string')
            : []
        }));
        
        setPlaces(transformedData);
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  // Create Fuse instances for fuzzy search
  const statesFuse = useMemo(() => {
    const statesList = places.map(place => ({
      name: place.state_or_ut,
      pincodes: place.pincodes,
      cities: place.cities
    }));
    
    return new Fuse(statesList, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    });
  }, [places]);

  const citiesFuse = useMemo(() => {
    const citiesList = places.flatMap(place => 
      place.cities.map(city => ({
        name: city,
        state: place.state_or_ut,
        pincodes: place.pincodes
      }))
    );
    
    return new Fuse(citiesList, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    });
  }, [places]);

  // Filter states and cities based on pincode
  const filterByPincode = (pincode: string) => {
    if (!pincode || pincode.length < 6) {
      setFilteredStates(places.map(p => p.state_or_ut));
      setFilteredCities(places.flatMap(p => p.cities));
      return;
    }

    const matchingPlaces = places.filter(place => 
      place.pincodes.some(pc => pc.startsWith(pincode.substring(0, 3)))
    );

    setFilteredStates(matchingPlaces.map(p => p.state_or_ut));
    setFilteredCities(matchingPlaces.flatMap(p => p.cities));
  };

  // Extract location suggestions from address text
  const extractLocationSuggestions = (addressLine1: string, addressLine2: string): LocationSuggestion => {
    const combinedText = `${addressLine1} ${addressLine2}`.toUpperCase();
    
    // Extract pincode using regex
    const pincodeMatch = combinedText.match(/\b\d{6}\b/);
    const extractedPincode = pincodeMatch ? pincodeMatch[0] : undefined;

    // Search for state mentions
    const stateResults = statesFuse.search(combinedText);
    const suggestedState = stateResults.length > 0 && stateResults[0].score! < 0.5 
      ? stateResults[0].item.name 
      : undefined;

    // Search for city mentions
    const cityResults = citiesFuse.search(combinedText);
    const suggestedCity = cityResults.length > 0 && cityResults[0].score! < 0.5
      ? cityResults[0].item.name
      : undefined;

    return {
      pincode: extractedPincode,
      city: suggestedCity,
      state: suggestedState
    };
  };

  // Get pincode suggestions based on partial input
  const getPincodeSuggestions = (partialPincode: string): string[] => {
    if (partialPincode.length < 3) return [];
    
    const allPincodes = places.flatMap(place => place.pincodes);
    return allPincodes
      .filter(pincode => pincode.startsWith(partialPincode))
      .slice(0, 10); // Limit to 10 suggestions
  };

  return {
    places,
    loading,
    filteredStates,
    filteredCities,
    filterByPincode,
    extractLocationSuggestions,
    getPincodeSuggestions
  };
};