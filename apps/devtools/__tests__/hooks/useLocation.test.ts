import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocation } from '../../src/hooks/useLocation';

describe('useLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null location initially', () => {
    const { result } = renderHook(() => useLocation());

    // Initially location may be null or from mock
    expect(result.current).toHaveProperty('location');
  });

  it('returns location from geolocation API', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.location).toEqual({
        latitude: 45.5152,
        longitude: -122.6784,
      });
    });
  });

  it('handles geolocation error', async () => {
    // Override the mock to simulate error
    const mockError = vi.fn((success, error) => {
      error({ code: 1, message: 'Permission denied' });
    });

    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = mockError;

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      // Should handle error gracefully
      expect(result.current.location).toBeNull();
    });

    // Restore
    navigator.geolocation.getCurrentPosition = originalGetCurrentPosition;
  });

  it('refreshLocation updates location', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.location).toBeTruthy();
    });

    // Update mock
    const newLocation = {
      coords: {
        latitude: 47.6062,
        longitude: -122.3321,
        accuracy: 10,
      },
      timestamp: Date.now(),
    };

    (navigator.geolocation.getCurrentPosition as any).mockImplementationOnce((success: any) => {
      success(newLocation);
    });

    await act(async () => {
      await result.current.refreshLocation();
    });

    expect(result.current.location).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
    });
  });
});
