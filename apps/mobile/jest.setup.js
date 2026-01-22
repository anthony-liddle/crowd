// Mock AsyncStorage with proper state tracking
const mockAsyncStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    // Helper to reset store between tests
    __reset: () => {
      store = {};
    },
    __getStore: () => store,
  };
})();

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 45.5152,
        longitude: -122.6784,
        accuracy: 10,
      },
      timestamp: Date.now(),
    })
  ),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// Mock expo-secure-store
const mockSecureStore = (() => {
  let store = {};
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    __reset: () => {
      store = {};
    },
  };
})();

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock react-native-get-random-values (uuid dependency)
jest.mock('react-native-get-random-values', () => ({}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

// Mock react-native StyleSheet and other commonly used APIs
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
  },
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

// Mock nativewind to avoid react-native import issues
jest.mock('nativewind', () => ({
  styled: (component) => component,
  useColorScheme: () => 'light',
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.__reset();
  mockSecureStore.__reset();
});

// Export for tests that need direct access
global.__mockAsyncStorage = mockAsyncStorage;
global.__mockSecureStore = mockSecureStore;
