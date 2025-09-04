import React from "react";
import { useOnboardingStore } from "../utils/onboardingStore";
import { FancyOnboarding } from "../components/onboarding/Onboarding";
import { ONBOARDING_STEPS } from "../onboarding/steps";
import { registerForPushNotificationsAsync, registerPushTokenOnBackend } from "../utils/notifications";
import { useSession } from "../context/SessionProvider";


export default function OnboardingScreen() {
    const { completeOnboarding } = useOnboardingStore();
    const { customUser } = useSession();

    return (
        <FancyOnboarding
            steps={ONBOARDING_STEPS}
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
            onStepNext={async (step) => {
                if (step.id !== "push") return;
                console.log("Onboarding: registering for push notifications...");
                // 1) Demande la permission + récup token (style Expo)
                const token = await registerForPushNotificationsAsync().catch(() => null);
                console.log("Onboarding: push token =", token);
                // 2) Enregistre côté backend si on a un userId et un token
                if (customUser?.id && token) {
                    console.log("Onboarding: registering push token on backend...");
                    await registerPushTokenOnBackend(customUser.id, token).catch(() => { });
                }
            }}
        />
    );
}