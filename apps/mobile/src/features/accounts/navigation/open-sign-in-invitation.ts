import { useRouter, useUnstableGlobalHref } from "expo-router";

/** Keeps an internal destination for the return when a new subject remounts the native stack. */
export function useOpenSignInInvitation() {
  const router = useRouter();
  const returnTo = useUnstableGlobalHref() || undefined;
  return (reason?: "follow" | "contribution" | "stream-report") => {
    router.push({
      pathname: "/sign-in-invitation",
      params: { reason, returnTo },
    });
  };
}
