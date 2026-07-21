/**
 * Browser storage used only by the local web characterization surface.
 * Native builds continue to use Expo SecureStore.
 */
export const secureStorage = {
  setItem: async (key: string, value: string) => {
    window.localStorage.setItem(key, value);
  },
  getItem: async (key: string) => window.localStorage.getItem(key),
  removeItem: async (key: string) => {
    window.localStorage.removeItem(key);
  },
};
