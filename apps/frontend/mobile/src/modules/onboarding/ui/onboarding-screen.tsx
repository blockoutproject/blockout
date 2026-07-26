import React from "react";

import { useOnboardingStore } from "@/src/modules/onboarding/model/onboarding-store";
import { ONBOARDING_STEPS } from "@/src/modules/onboarding/model/steps";
import { Onboarding } from "@/src/modules/onboarding/ui/onboarding";
import { useRegisterPushToken } from "@/src/modules/notifications/hooks/use-register-push-token";
import { registerForPushNotificationsAsync } from "@/src/modules/notifications/push";
import { useSessionState } from "@/src/modules/session/providers/session-context";

/** Connects onboarding completion and push registration to the presentation. */
const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useOnboardingStore();
  const { customUser } = useSessionState();
  const registerPushToken = useRegisterPushToken();

  return (
    <Onboarding
      steps={ONBOARDING_STEPS}
      onComplete={completeOnboarding}
      onSkip={completeOnboarding}
      onStepNext={async (step) => {
        if (step.id !== "push") {
          return;
        }

        const token = await registerForPushNotificationsAsync().catch(
          () => null,
        );
        if (customUser?.id && token) {
          await registerPushToken(customUser.id, token).catch(() => undefined);
        }
      }}
    />
  );
};

export default OnboardingScreen;
