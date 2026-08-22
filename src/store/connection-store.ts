import { create } from 'zustand';

export type ConnectionState = 'connecting' | 'online' | 'offline';

interface ConnectionStore {
  /** Browser network status. */
  isNetworkOnline: boolean;
  /** Socket handshake completed and all rooms joined. */
  isSocketReady: boolean;
  /** Timestamp of the newest change this client knows about (sync cursor). */
  syncCursor: string | null;
  setNetworkOnline: (online: boolean) => void;
  setSocketReady: (ready: boolean) => void;
  setSyncCursor: (cursor: string) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  isNetworkOnline: true,
  isSocketReady: false,
  syncCursor: null,
  setNetworkOnline: (online) => set({ isNetworkOnline: online }),
  setSocketReady: (ready) => set({ isSocketReady: ready }),
  setSyncCursor: (cursor) => set({ syncCursor: cursor }),
}));

/** Single derived status used by the UI banner and the composer. */
export function resolveConnectionState(store: ConnectionStore): ConnectionState {
  if (!store.isNetworkOnline) return 'offline';
  return store.isSocketReady ? 'online' : 'connecting';
}
