import { useEffect } from "react";

import { registerForPushNotificationsAsync } from "@/src/modules/notifications/api/push-notifications";
import { useRegisterPushToken } from "@/src/modules/notifications/hooks/use-register-push-token";
import { useOnboardingStore } from "@/src/modules/onboarding/model/onboarding-store";
import { useSessionState } from "@/src/modules/session/providers/session-context";

export const PushRegistrationController = () => {
  const { customUser, isAuthenticated } = useSessionState();
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding,
  );
  const registerPushToken = useRegisterPushToken();

  useEffect(() => {
    if (!hasCompletedOnboarding || !isAuthenticated) return;

    const register = async () => {
      try {
        const token = await registerForPushNotificationsAsync().catch(
          () => null,
        );
        if (customUser?.id && token) {
          await registerPushToken(customUser.id, token).catch(() => {});
        }
      } catch {}
    };

    void register();
  }, [
    customUser?.id,
    hasCompletedOnboarding,
    isAuthenticated,
    registerPushToken,
  ]);

  return null;
};
