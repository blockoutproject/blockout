import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "./secureStorage";


type OnboardingState = {
    hasCompletedOnboarding: boolean;
    _hasHydrated: boolean;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
    setHasHydrated: (v: boolean) => void;
};

export const useOnboardingStore = create(
    persist<OnboardingState>(
        (set) => ({
            hasCompletedOnboarding: false,
            _hasHydrated: false,
            completeOnboarding: () => set({ hasCompletedOnboarding: true }),
            resetOnboarding: () => set({ hasCompletedOnboarding: false }),
            setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),
        }),
        {
            name: "onboarding-store",
            storage: createJSONStorage(() => secureStorage),
            onRehydrateStorage: () => {
                return (state) => {
                    state?.setHasHydrated(true);
                };
            },
        }
    )
);
