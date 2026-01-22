import React from 'react';
import { render } from '@testing-library/react-native';
import { CharacterCounter } from '../../src/components/CharacterCounter';

describe('CharacterCounter', () => {
  it('shows current/limit format', () => {
    const { getByText } = render(<CharacterCounter current={50} limit={500} />);
    expect(getByText('50/500')).toBeTruthy();
  });

  it('renders correctly at 0 characters', () => {
    const { getByText } = render(<CharacterCounter current={0} limit={500} />);
    expect(getByText('0/500')).toBeTruthy();
  });

  it('renders correctly at exactly limit', () => {
    const { getByText } = render(<CharacterCounter current={500} limit={500} />);
    expect(getByText('500/500')).toBeTruthy();
  });

  it('renders correctly over limit', () => {
    const { getByText } = render(<CharacterCounter current={550} limit={500} />);
    expect(getByText('550/500')).toBeTruthy();
  });

  // Note: Style testing is limited in React Native Testing Library
  // These tests just verify the component renders at different thresholds

  it('renders under 80% threshold', () => {
    const { getByText } = render(<CharacterCounter current={100} limit={500} />);
    const element = getByText('100/500');
    expect(element).toBeTruthy();
  });

  it('renders at 80% threshold', () => {
    const { getByText } = render(<CharacterCounter current={400} limit={500} />);
    const element = getByText('400/500');
    expect(element).toBeTruthy();
  });

  it('renders at 100% threshold', () => {
    const { getByText } = render(<CharacterCounter current={500} limit={500} />);
    const element = getByText('500/500');
    expect(element).toBeTruthy();
  });

  it('handles different limits', () => {
    const { getByText } = render(<CharacterCounter current={100} limit={200} />);
    expect(getByText('100/200')).toBeTruthy();
  });
});
