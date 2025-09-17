import localforage from 'localforage';

// Configure localForage
localforage.config({
  name: 'nostr-community-requests',
  storeName: 'nostr-storage',
});

// Storage keys
const STORAGE_KEYS = {
  LOCAL_SECRET_KEY: 'local-secret-key',
  BUNKER_CONNECTION_TOKEN: 'bunker-connection-token',
  BUNKER_LOCAL_SECRET_KEY: 'bunker-local-secret-key',
  BUNKER_PUBLIC_KEY: 'bunker-public-key',
} as const;

// Storage utility functions
export const storage = {
  async saveSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      await localforage.setItem(
        STORAGE_KEYS.LOCAL_SECRET_KEY,
        Array.from(secretKey)
      );
    } catch (error) {
      console.error('Failed to save secret key:', error);
    }
  },

  async loadSecretKey(): Promise<Uint8Array | null> {
    try {
      const stored = await localforage.getItem<number[]>(
        STORAGE_KEYS.LOCAL_SECRET_KEY
      );
      return stored ? new Uint8Array(stored) : null;
    } catch (error) {
      console.error('Failed to load secret key:', error);
      return null;
    }
  },

  async saveBunkerToken(token: string): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.BUNKER_CONNECTION_TOKEN, token);
    } catch (error) {
      console.error('Failed to save bunker token:', error);
    }
  },

  async loadBunkerToken(): Promise<string | null> {
    try {
      return await localforage.getItem<string>(
        STORAGE_KEYS.BUNKER_CONNECTION_TOKEN
      );
    } catch (error) {
      console.error('Failed to load bunker token:', error);
      return null;
    }
  },

  async saveBunkerLocalSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      await localforage.setItem(
        STORAGE_KEYS.BUNKER_LOCAL_SECRET_KEY,
        Array.from(secretKey)
      );
    } catch (error) {
      console.error('Failed to save bunker local secret key:', error);
    }
  },

  async loadBunkerLocalSecretKey(): Promise<Uint8Array | null> {
    try {
      const stored = await localforage.getItem<number[]>(
        STORAGE_KEYS.BUNKER_LOCAL_SECRET_KEY
      );
      return stored ? new Uint8Array(stored) : null;
    } catch (error) {
      console.error('Failed to load bunker local secret key:', error);
      return null;
    }
  },

  async saveBunkerPublicKey(publicKey: string): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.BUNKER_PUBLIC_KEY, publicKey);
    } catch (error) {
      console.error('Failed to save bunker public key:', error);
    }
  },

  async loadBunkerPublicKey(): Promise<string | null> {
    try {
      return await localforage.getItem<string>(STORAGE_KEYS.BUNKER_PUBLIC_KEY);
    } catch (error) {
      console.error('Failed to load bunker public key:', error);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await localforage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },

  async hasStoredData(): Promise<boolean> {
    try {
      const [hasSecretKey, hasBunkerToken] = await Promise.all([
        localforage.getItem(STORAGE_KEYS.LOCAL_SECRET_KEY),
        localforage.getItem(STORAGE_KEYS.BUNKER_CONNECTION_TOKEN),
      ]);
      return !!(hasSecretKey || hasBunkerToken);
    } catch (error) {
      console.error('Failed to check stored data:', error);
      return false;
    }
  },
};
