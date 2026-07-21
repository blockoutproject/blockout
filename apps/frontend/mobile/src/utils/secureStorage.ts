import * as SecureStore from "expo-secure-store";

/** Persistent key/value storage backed by the native secure store. */
export const secureStorage = {
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
