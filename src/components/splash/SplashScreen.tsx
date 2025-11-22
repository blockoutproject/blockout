import { useEffect } from "react";
import { SplashScreen } from "expo-router";
import { useSession } from "../../context/SessionProvider";

export function SplashScreenController() {
    const { isLoading } = useSession();

    useEffect(() => {
        if (!isLoading) SplashScreen.hide();
    }, [isLoading]);

    return null;
}