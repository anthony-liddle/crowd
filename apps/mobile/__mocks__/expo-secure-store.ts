const store: Record<string, string> = {};

export const getItemAsync = jest.fn(async (key: string) => {
  return store[key] || null;
});

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store[key] = value;
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  delete store[key];
});

// Helper to reset the mock store between tests
export const __resetStore = () => {
  Object.keys(store).forEach((key) => delete store[key]);
};
