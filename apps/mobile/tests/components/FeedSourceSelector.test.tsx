import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { FeedSource } from '@/types';

describe('FeedSourceSelector', () => {
  const mockSources: FeedSource[] = [
    { id: null, name: 'Global' },
    { id: 'crowd-1', name: 'Test Crowd' },
  ];

  it('should render when multiple sources available', () => {
    const mockOnSourceChange = jest.fn();
    const { getByText } = render(
      <FeedSourceSelector
        sources={mockSources}
        selectedSource={mockSources[0]}
        onSourceChange={mockOnSourceChange}
      />
    );

    expect(getByText(/🌍 Global Feed/)).toBeTruthy();
  });

  it('should not render when only one source', () => {
    const mockOnSourceChange = jest.fn();
    const singleSource: FeedSource[] = [{ id: null, name: 'Global' }];
    const { queryByText } = render(
      <FeedSourceSelector
        sources={singleSource}
        selectedSource={singleSource[0]}
        onSourceChange={mockOnSourceChange}
      />
    );

    expect(queryByText(/Global Feed/)).toBeNull();
  });

  it('should display selected source', () => {
    const mockOnSourceChange = jest.fn();
    const { getByText } = render(
      <FeedSourceSelector
        sources={mockSources}
        selectedSource={mockSources[1]}
        onSourceChange={mockOnSourceChange}
      />
    );

    expect(getByText(/👥 Test Crowd/)).toBeTruthy();
  });
});
