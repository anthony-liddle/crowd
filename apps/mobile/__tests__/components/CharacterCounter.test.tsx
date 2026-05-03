import React from 'react';
import { render } from '@testing-library/react-native';
import { CharacterCounter } from '../../src/components/CharacterCounter';

describe('CharacterCounter', () => {
  it('shows current / limit format', () => {
    const { getByText } = render(<CharacterCounter current={50} limit={500} />);
    expect(getByText('50 / 500')).toBeTruthy();
  });

  it('renders correctly at 0 characters', () => {
    const { getByText } = render(<CharacterCounter current={0} limit={500} />);
    expect(getByText('0 / 500')).toBeTruthy();
  });

  it('renders correctly at exactly limit', () => {
    const { getByText } = render(<CharacterCounter current={500} limit={500} />);
    expect(getByText('500 / 500')).toBeTruthy();
  });

  it('renders correctly over limit', () => {
    const { getByText } = render(<CharacterCounter current={550} limit={500} />);
    expect(getByText('550 / 500')).toBeTruthy();
  });

  // Note: visual tone (dust / ember / warn) is class-based; we only assert
  // that the component renders the expected text at each threshold.

  it('renders well below the warn threshold', () => {
    const { getByText } = render(<CharacterCounter current={100} limit={500} />);
    expect(getByText('100 / 500')).toBeTruthy();
  });

  it('renders within the ember band (limit - 10)', () => {
    const { getByText } = render(<CharacterCounter current={491} limit={500} />);
    expect(getByText('491 / 500')).toBeTruthy();
  });

  it('renders at the warn threshold', () => {
    const { getByText } = render(<CharacterCounter current={500} limit={500} />);
    expect(getByText('500 / 500')).toBeTruthy();
  });

  it('handles different limits', () => {
    const { getByText } = render(<CharacterCounter current={100} limit={200} />);
    expect(getByText('100 / 200')).toBeTruthy();
  });
});
