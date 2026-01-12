import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Location as LocationType } from '@/types/location';

interface UseLocationResult {
  location: LocationType | null;
  errorMsg: string | null;
  loading: boolean;
  refreshLocation: () => Promise<void>;
}

/**
 * Custom hook for location management.
 * @returns An object containing the location, error message, loading state, and a function to refresh the location.
 */
export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getLocation = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      setErrorMsg('Error fetching location');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return {
    location,
    errorMsg,
    loading,
    refreshLocation: getLocation,
  };
};
