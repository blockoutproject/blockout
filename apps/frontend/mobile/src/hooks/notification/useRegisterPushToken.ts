import { registerPushTokenOnBackend } from '@/src/utils/notifications';

/** Exposes the shared generated push-registration workflow. */
export function useRegisterPushToken() {
  return async (userId: number, expoPushToken: string | null) => {
    await registerPushTokenOnBackend(userId, expoPushToken);
  };
}
