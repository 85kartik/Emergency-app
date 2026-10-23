import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestAndGet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(
          'Location permission denied. You can still submit an emergency with a manual location description.'
        );
        setLoading(false);
        return null;
      }

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (gpsErr) {
        // Fallback to last known position if real-time satellite fix is unavailable
        pos = await Location.getLastKnownPositionAsync();
        if (!pos) throw gpsErr;
      }

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      setLoading(false);
      return coords;
    } catch (e) {
      setError(
        'Unable to get location. You can enter a location description manually.'
      );
      setLoading(false);
      return null;
    }
  }, []);

  return { location, error, loading, requestAndGet };
}
