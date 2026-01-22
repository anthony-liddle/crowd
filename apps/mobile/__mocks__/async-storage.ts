const store: Record<string, string> = {};

export default {
  getItem: jest.fn(async (key: string) => {
    return store[key] || null;
  }),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach((key) => delete store[key]);
  }),
  getAllKeys: jest.fn(async () => Object.keys(store)),
  multiGet: jest.fn(async (keys: string[]) => {
    return keys.map((key) => [key, store[key] || null]);
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      store[key] = value;
    });
  }),
  // Helper to reset the mock store between tests
  __resetStore: () => {
    Object.keys(store).forEach((key) => delete store[key]);
  },
};
