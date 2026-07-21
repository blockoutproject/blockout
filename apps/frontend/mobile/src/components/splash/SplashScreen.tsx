import {useEffect} from "react";
import {SplashScreen} from "expo-router";
import {useSession} from "../../context/SessionProvider";

export function SplashScreenController() {
  const {isLoading, isBootstrapped} = useSession();

  useEffect(() => {
    if (!isLoading && isBootstrapped) {
      SplashScreen.hide();
    }
  }, [isLoading, isBootstrapped]);

  return null;
}
