import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Location as LocationType } from '@/types/location';

export type LocationFetchError = 'timeout' | 'permission_denied' | 'gps_unavailable';

export type LocationResult =
  | { ok: true; location: LocationType }
  | { ok: false; error: LocationFetchError; details?: string };

interface GetFreshLocationOptions {
  maxAgeMs?: number;
  timeoutMs?: number;
}

interface UseLocationResult {
  location: LocationType | null;
  errorMsg: string | null;
  loading: boolean;
  refreshLocation: () => Promise<void>;
  getFreshLocation: (options?: GetFreshLocationOptions) => Promise<LocationResult>;
}

const DEFAULT_MAX_AGE_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 5_000;

export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLocation = useCallback(async () => {
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
  }, []);

  // Action-time fetch: re-runs every time something *acts* on location, so
  // backgrounded/slept JS can't leak a stale reading into a request body. Uses
  // read-only permission check on the hot path; only the explicit retry path
  // in the UI re-prompts.
  const getFreshLocation = useCallback(
    async (options: GetFreshLocationOptions = {}): Promise<LocationResult> => {
      const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { ok: false, error: 'permission_denied' };
      }

      try {
        // Expo splits "use cached if recent" and "fix now" across two calls.
        // Try the OS-cached reading first (cheap, instant); if it's missing or
        // older than maxAgeMs, force a fresh fix with a timeout race.
        const cached = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs });
        if (cached) {
          const location = {
            latitude: cached.coords.latitude,
            longitude: cached.coords.longitude,
          };
          setLocation(location);
          setErrorMsg(null);
          return { ok: true, location };
        }

        const fetchPromise = Location.getCurrentPositionAsync({});
        const timeoutPromise = new Promise<LocationResult>((resolve) =>
          setTimeout(() => resolve({ ok: false, error: 'timeout' }), timeoutMs),
        );

        const result = await Promise.race([
          fetchPromise.then(
            (position) =>
              ({
                ok: true as const,
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
              }) satisfies LocationResult,
          ),
          timeoutPromise,
        ]);

        if (result.ok) {
          setLocation(result.location);
          setErrorMsg(null);
        }
        return result;
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        return { ok: false, error: 'gps_unavailable', details };
      }
    },
    [],
  );

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  return {
    location,
    errorMsg,
    loading,
    refreshLocation,
    getFreshLocation,
  };
};
