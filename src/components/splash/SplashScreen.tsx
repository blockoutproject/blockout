import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { useSession } from "../../context/SessionProvider";

export function SplashScreenController() {
    const { appReady } = useSession();

    useEffect(() => {
        if (appReady) SplashScreen.hide();
    }, [appReady]);

    return null;
}