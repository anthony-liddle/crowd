export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
});

export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: {
    latitude: 45.5152,
    longitude: -122.6784,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

export const LocationAccuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};
