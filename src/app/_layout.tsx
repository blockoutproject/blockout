import React, { useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "react-native-auth0";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import mobileAds from "react-native-google-mobile-ads";
import {
    getTrackingPermissionsAsync,
    requestTrackingPermissionsAsync,
    PermissionStatus,
} from "expo-tracking-transparency";

import { AUTH0_CONFIG } from "@/src/config/config";
import { ThemeProvider } from "@/src/theme/theme-provider";
import { ApiProvider } from "@/src/context/ApiProvider";
import { SessionProvider, useSession } from "@/src/context/SessionProvider";
import { SplashScreenController } from "@/src/components/splash/SplashScreen";
import { useOnboardingStore } from "../utils/onboardingStore";
import {
    addNotificationListeners,
    openNotificationUrlIfAny,
} from "../utils/notifications";

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

    useEffect(() => {
        const initAds = async () => {
            try {
                if (Platform.OS === "ios") {
                    const { status } = await getTrackingPermissionsAsync();

                    if (status === PermissionStatus.UNDETERMINED) {
                        await requestTrackingPermissionsAsync();
                    }
                }

                await mobileAds().initialize();
                console.log("Mobile Ads initialized ✅");
            } catch (e) {
                console.warn("Failed to initialize Mobile Ads", e);
            }
        };

        initAds();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <StatusBar barStyle="light-content" />
                    <Auth0Provider
                        domain={AUTH0_CONFIG.domain}
                        clientId={AUTH0_CONFIG.clientId}
                    >
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
    const {
        isAuthenticated,
        isGuest,
        isMaintenance,
        maintenanceBypass,
        isUpdateRequired,
        updateBypass,
    } = useSession();
    const { hasCompletedOnboarding } = useOnboardingStore();

    const isBlockedByUpdate = isUpdateRequired && !updateBypass;
    const isBlockedByMaintenance = isMaintenance && !maintenanceBypass;
    const isGloballyBlocked = isBlockedByUpdate || isBlockedByMaintenance;

    return (
        <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Protected guard={isBlockedByMaintenance}>
                    <Stack.Screen
                        name="maintenance"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={isBlockedByUpdate && !isBlockedByMaintenance}>
                    <Stack.Screen
                        name="update-required"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected
                    guard={!(isGuest || isAuthenticated) && !isGloballyBlocked}
                >
                    <Stack.Screen
                        name="sign-in"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected
                    guard={(isGuest || isAuthenticated) && !isGloballyBlocked}
                >
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