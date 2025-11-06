import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

type GuestState = {
    isGuest: boolean;
    _hasHydrated: boolean;
    continueAsGuest: () => void;
    leaveGuest: () => void;
    setHasHydrated: (v: boolean) => void;
};

export const useGuestSessionStore = create(
    persist<GuestState>(
        (set) => ({
            isGuest: false,
            _hasHydrated: false,
            continueAsGuest: () => set({ isGuest: true }),
            leaveGuest: () => set({ isGuest: false }),
            setHasHydrated: (v) => set({ _hasHydrated: v }),
        }),
        {
            name: "guest-session",
            storage: createJSONStorage(() => ({
                setItem: (k, v) => SecureStore.setItemAsync(k, v),
                getItem: (k) => SecureStore.getItemAsync(k),
                removeItem: (k) => SecureStore.deleteItemAsync(k),
            })),
            onRehydrateStorage: () => {
                return (state) => state?.setHasHydrated(true);
            },
        }
    )
);