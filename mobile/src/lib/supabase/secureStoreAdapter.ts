import * as SecureStore from "expo-secure-store";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const supabaseSecureStorage = {
  getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key, secureStoreOptions);
  },
  setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value, secureStoreOptions);
  },
  removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key, secureStoreOptions);
  },
};
