import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocation } from '../../src/hooks/useLocation';

// Get the mock functions
const mockRequestForegroundPermissionsAsync = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetCurrentPositionAsync = Location.getCurrentPositionAsync as jest.Mock;

describe('useLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.5152,
        longitude: -122.6784,
        accuracy: 10,
      },
      timestamp: Date.now(),
    });
  });

  it('returns loading initially', async () => {
    const { result } = renderHook(() => useLocation());

    // Initially loading should be true
    expect(result.current.loading).toBe(true);

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('returns location when permission granted', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toEqual({
      latitude: 45.5152,
      longitude: -122.6784,
    });
    expect(result.current.errorMsg).toBeNull();
  });

  it('returns error when permission denied', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toBeNull();
    expect(result.current.errorMsg).toBe('Permission to access location was denied');
  });

  it('returns error when location fetch fails', async () => {
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('Location error'));

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toBeNull();
    expect(result.current.errorMsg).toBe('Error fetching location');
  });

  it('refreshLocation updates location', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update mock for new location
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 47.6062,
        longitude: -122.3321,
        accuracy: 10,
      },
      timestamp: Date.now(),
    });

    await act(async () => {
      await result.current.refreshLocation();
    });

    expect(result.current.location).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
    });
  });

  it('requests permissions when refreshing', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();

    await act(async () => {
      await result.current.refreshLocation();
    });

    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
  });
});
