import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "react-native-auth0";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG } from "@/src/config/config";
import { ThemeProvider } from "@/src/theme/theme-provider";

import { ApiProvider } from "@/src/context/ApiProvider";
import { SessionProvider, useSession } from "@/src/context/SessionProvider";
import { SplashScreenController } from "@/src/session/splash";
import { useOnboardingStore } from "../utils/onboardingStore";
import { addNotificationListeners, openNotificationUrlIfAny } from "../utils/notifications";
import MaintenanceScreen from "./maintenance";
import useHasScopes from "../hooks/user/useHasScopes";

const queryClient = new QueryClient();

export default function Root() {
    useEffect(() => {
        const remove = addNotificationListeners({
            onRespond: (response) => {
                const data = response.notification.request.content.data;
                openNotificationUrlIfAny(data);
            },
        });
        return remove;
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <StatusBar barStyle={"light-content"} />
                    <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                        <ApiProvider>
                            <SessionProvider>
                                <SplashScreenController />
                                <RootNavigator />
                            </SessionProvider>
                        </ApiProvider>
                    </Auth0Provider>
                </ThemeProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}

function RootNavigator() {
    const { isAuthenticated, isGuest } = useSession();
    const { hasCompletedOnboarding } = useOnboardingStore();

        const { allowed: canBypassMaintenance } = useHasScopes(["admin:maintenance_bypass"]);

    // const {
    //     data: appStatus,
    //     isLoading: statusLoading,
    //     isError: statusError,
    //     refetch: refetchStatus,
    // } = useAppStatus();

    //const maintenanceEnabled = appStatus?.maintenance === true;

    // Stratégie :
    // - si maintenance activée et pas de bypass -> écran maintenance
    // - si erreur réseau sur la route de status -> on laisse passer (fail open)
    if (true) {
        return (
            <MaintenanceScreen
                loading={false}
                message={"appStatus?.message"}
                onRetry={() => null}
            />
        );
    }

    return (
        <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Protected guard={!(isGuest || isAuthenticated)}>
                    <Stack.Screen
                        name="sign-in"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={isGuest || isAuthenticated}>
                    <Stack.Protected guard={!hasCompletedOnboarding}>
                        <Stack.Screen
                            name="onboarding"
                            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                        />
                    </Stack.Protected>
                </Stack.Protected>

                <Stack.Protected guard={isGuest || isAuthenticated}>
                    <Stack.Screen
                        name="(tabs)"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                    <Stack.Screen
                        name="pdf-viewer"
                        options={{
                            title: "Document",
                            presentation: "modal",
                            animation: "fade_from_bottom",
                            animationDuration: 300,
                        }}
                    />
                </Stack.Protected>
            </Stack>
        </BottomSheetModalProvider>
    );
}