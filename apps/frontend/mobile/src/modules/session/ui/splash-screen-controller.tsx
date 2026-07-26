import { useEffect } from "react";
import { SplashScreen } from "expo-router";
import { useSessionState } from "@/src/modules/session/providers/session-context";

/** Keeps the native splash visible until session bootstrap has completed. */
export function SplashScreenController() {
  const { isLoading, isBootstrapped } = useSessionState();

  useEffect(() => {
    if (!isLoading && isBootstrapped) {
      SplashScreen.hide();
    }
  }, [isLoading, isBootstrapped]);

  return null;
}
