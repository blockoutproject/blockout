import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "@/src/utils/secureStorage";

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
            storage: createJSONStorage(() => secureStorage),
            onRehydrateStorage: () => {
                return (state) => state?.setHasHydrated(true);
            },
        }
    )
);
