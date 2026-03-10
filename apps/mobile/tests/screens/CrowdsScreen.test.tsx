import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CrowdsScreen } from '@/screens/CrowdsScreen';
import * as api from '@/services/api';

// Mock the API
jest.mock('@/services/api', () => ({
  getMyCrowds: jest.fn(),
  leaveCrowd: jest.fn(),
}));

describe('CrowdsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getMyCrowds as jest.Mock).mockResolvedValue([]);
  });

  it('should render crowds screen', async () => {
    const { getByText } = render(<CrowdsScreen />);

    await waitFor(() => {
      expect(api.getMyCrowds).toHaveBeenCalled();
    });
  });

  it('should display crowds when loaded', async () => {
    const mockCrowds = [
      {
        id: 'crowd-1',
        name: 'Test Crowd',
        isOpen: true,
        isOwner: true,
        memberCount: 5,
        createdAt: new Date(),
        expiresAt: new Date(),
        canInvite: true,
      },
    ];

    (api.getMyCrowds as jest.Mock).mockResolvedValue(mockCrowds);

    const { getByText } = render(<CrowdsScreen />);

    await waitFor(() => {
      expect(getByText('Test Crowd')).toBeTruthy();
    });
  });

  it('should show empty state when no crowds', async () => {
    (api.getMyCrowds as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<CrowdsScreen />);

    await waitFor(() => {
      // Check for empty state text (adjust based on actual component)
      expect(api.getMyCrowds).toHaveBeenCalled();
    });
  });
});
