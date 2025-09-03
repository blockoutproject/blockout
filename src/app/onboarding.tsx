import React from "react";
import { useOnboardingStore } from "../utils/onboardingStore";
import { FancyOnboarding } from "../components/onboarding/Onboarding";
import { ONBOARDING_STEPS } from "../onboarding/steps";


export default function OnboardingScreen() {
    const { completeOnboarding } = useOnboardingStore();

    return (
        <FancyOnboarding
            steps={ONBOARDING_STEPS}
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
        />
    );
}