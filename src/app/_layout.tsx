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

const queryClient = new QueryClient();

export default function Root() {
    useEffect(() => {
        const removeListeners = addNotificationListeners({
            onRespond: (response) => {
                const data = response.notification.request.content.data;
                openNotificationUrlIfAny(data);
            },
        });

        return removeListeners;
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <StatusBar barStyle={"light-content"} />
                    <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                        <SessionProvider>
                            <ApiProvider>
                                <SplashScreenController />
                                <RootNavigator />
                            </ApiProvider>
                        </SessionProvider>
                    </Auth0Provider>
                </ThemeProvider>
            </QueryClientProvider>
        </GestureHandlerRootView >
    );
}

function RootNavigator() {
    const { isReady } = useSession();
    const { hasCompletedOnboarding } = useOnboardingStore();

    return (
        <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Protected guard={!isReady}>
                    <Stack.Screen
                        name="sign-in"
                        options={{
                            animation: "fade_from_bottom",
                            animationDuration: 300,
                        }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={isReady}>
                    <Stack.Protected guard={!hasCompletedOnboarding}>
                        <Stack.Screen
                            name="onboarding"
                            options={{
                                animation: "fade_from_bottom",
                                animationDuration: 300,
                            }}
                        />
                    </Stack.Protected>
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            animation: "fade_from_bottom",
                            animationDuration: 300,
                        }}
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