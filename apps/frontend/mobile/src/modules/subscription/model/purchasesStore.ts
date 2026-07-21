import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "@/src/shared/storage/secureStorage";

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
            storage: createJSONStorage(() => secureStorage),
            onRehydrateStorage: () => {
                return (state) => state?.setHasHydrated(true);
            },
        },
    ),
);
