import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortFeed } from '@/components/SortFeed';

describe('SortFeed', () => {
  it('should render both sort options', () => {
    const mockSetSortBy = jest.fn();
    const { getByText } = render(
      <SortFeed sortBy="nearest" setSortBy={mockSetSortBy} />
    );

    expect(getByText('Nearest')).toBeTruthy();
    expect(getByText('Expiring Soon')).toBeTruthy();
  });

  it('should highlight selected sort option', () => {
    const mockSetSortBy = jest.fn();
    const { getByText } = render(
      <SortFeed sortBy="nearest" setSortBy={mockSetSortBy} />
    );

    const nearestButton = getByText('Nearest');
    expect(nearestButton.parent?.props.className).toContain('bg-blue-600');
  });

  it('should call setSortBy when nearest is pressed', () => {
    const mockSetSortBy = jest.fn();
    const { getByText } = render(
      <SortFeed sortBy="soonest" setSortBy={mockSetSortBy} />
    );

    const nearestButton = getByText('Nearest');
    fireEvent.press(nearestButton);

    expect(mockSetSortBy).toHaveBeenCalledWith('nearest');
  });

  it('should call setSortBy when soonest is pressed', () => {
    const mockSetSortBy = jest.fn();
    const { getByText } = render(
      <SortFeed sortBy="nearest" setSortBy={mockSetSortBy} />
    );

    const soonestButton = getByText('Expiring Soon');
    fireEvent.press(soonestButton);

    expect(mockSetSortBy).toHaveBeenCalledWith('soonest');
  });
});
