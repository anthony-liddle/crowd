/**
 * Calculate a new coordinate based on a starting point and a distance.
 * Adds the distance in a random direction (or fixed, but random is better for "mocking" presence nearby).
 * Simple implementation: 1 degree lat ~= 111km.
 */
export const getMockLocation = (
  lat: number,
  long: number,
  distanceKm: number
): { latitude: number; longitude: number } => {
  if (distanceKm === 0) return { latitude: lat, longitude: long };

  // Random bearing in radians
  const bearing = Math.random() * 2 * Math.PI;

  // Earth's radius in km
  const R = 6371;

  const latRad = (lat * Math.PI) / 180;
  const longRad = (long * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceKm / R) +
    Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearing)
  );

  const newLongRad =
    longRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(latRad),
      Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    latitude: (newLatRad * 180) / Math.PI,
    longitude: (newLongRad * 180) / Math.PI,
  };
};
