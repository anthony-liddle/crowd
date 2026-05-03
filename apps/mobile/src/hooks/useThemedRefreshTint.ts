import { useColorScheme } from 'nativewind';

const TINT_LIGHT = '#B85A2C';
const TINT_DARK = '#D08454';

// Resolves the ember tint as a literal hex for `RefreshControl` (and any other
// API that takes a literal color, not a Tailwind class).
export function useThemedRefreshTint(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? TINT_DARK : TINT_LIGHT;
}
