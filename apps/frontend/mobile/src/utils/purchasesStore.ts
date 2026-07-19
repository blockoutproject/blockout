import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

type PurchasesCacheState = {
    isProCached: boolean;
    _hasHydrated: boolean;
    setIsProCached: (v: boolean) => void;
    setHasHydrated: (v: boolean) => void;
    reset: () => void;
};

export const usePurchasesCacheStore = create(
    persist<PurchasesCacheState>(
        (set) => ({
            isProCached: false,
            _hasHydrated: false,
            setIsProCached: (v) => set({ isProCached: v }),
            setHasHydrated: (v) => set({ _hasHydrated: v }),
            reset: () => set({ isProCached: false }),
        }),
        {
            name: "purchases-cache",
            storage: createJSONStorage(() => ({
                setItem: (k, v) => SecureStore.setItemAsync(k, v),
                getItem: (k) => SecureStore.getItemAsync(k),
                removeItem: (k) => SecureStore.deleteItemAsync(k),
            })),
            onRehydrateStorage: () => {
                return (state) => state?.setHasHydrated(true);
            },
        },
    ),
);