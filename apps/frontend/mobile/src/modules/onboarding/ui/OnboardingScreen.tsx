import React from "react";
import {useOnboardingStore} from "@/src/utils/onboardingStore";
import {FancyOnboarding} from "@/src/components/onboarding/Onboarding";
import {ONBOARDING_STEPS} from "@/src/components/onboarding/steps";
import {registerForPushNotificationsAsync} from "@/src/modules/notifications/push";
import {useSessionState} from "@/src/shared/providers/SessionProvider";
import {useRegisterPushToken} from "@/src/modules/notifications/hooks/useRegisterPushToken";

const OnboardingScreen: React.FC = () => {
  const {completeOnboarding} = useOnboardingStore();
  const {customUser} = useSessionState();
  const registerPushToken = useRegisterPushToken();

  return (
    <FancyOnboarding
      steps={ONBOARDING_STEPS}
      onComplete={completeOnboarding}
      onSkip={completeOnboarding}
      onStepNext={async (step) => {
        if (step.id !== "push") return;
        const token = await registerForPushNotificationsAsync().catch(() => null);
        if (customUser?.id && token) {
          await registerPushToken(customUser.id, token).catch(() => {
          });
        }
      }}
    />
  );
};

export default OnboardingScreen;
