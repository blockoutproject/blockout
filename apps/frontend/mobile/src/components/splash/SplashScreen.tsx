import {useEffect} from "react";
import {SplashScreen} from "expo-router";
import {useSession} from "@/src/shared/providers/SessionProvider";

export function SplashScreenController() {
  const {isLoading, isBootstrapped} = useSession();

  useEffect(() => {
    if (!isLoading && isBootstrapped) {
      SplashScreen.hide();
    }
  }, [isLoading, isBootstrapped]);

  return null;
}
