import React from "react";
import { useOnboardingStore } from "@/src/utils/onboardingStore";
import { FancyOnboarding } from "@/src/components/onboarding/Onboarding";
import { ONBOARDING_STEPS } from "@/src/onboarding/steps";
import {
    registerForPushNotificationsAsync,
    registerPushTokenOnBackend,
} from "@/src/utils/notifications";
import { useSession } from "@/src/context/SessionProvider";

const OnboardingScreen: React.FC = () => {
    const { completeOnboarding } = useOnboardingStore();
    const { customUser } = useSession();

    return (
        <FancyOnboarding
            steps={ONBOARDING_STEPS}
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
            onStepNext={async (step) => {
                if (step.id !== "push") return;
                const token = await registerForPushNotificationsAsync().catch(() => null);
                if (customUser?.id && token) {
                    await registerPushTokenOnBackend(customUser.id, token).catch(() => { });
                }
            }}
        />
    );
};

export default OnboardingScreen;