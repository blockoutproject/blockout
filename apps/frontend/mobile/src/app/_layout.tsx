import React, { useCallback, useEffect } from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { Auth0Provider } from "@/src/shared/providers/AuthProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG, validateRequiredConfig } from "@/src/shared/config/config";
import { ThemeProvider } from "@/src/shared/providers/ThemeProvider";
import { ApiProvider } from "@/src/shared/providers/ApiProvider";
import { SessionProvider, useSessionState } from "@/src/shared/providers/SessionProvider";
import { SplashScreenController } from "@/src/components/splash/SplashScreen";
import { useOnboardingStore } from "../utils/onboardingStore";
import { useNavigationInterstitial } from "../hooks/ads/useNavigationInterstitial";
import { useConsentGDPR } from "../hooks/ads/useConsentGDPR";
import { PurchasesProvider } from "@/src/shared/providers/PurchasesProvider";
import { QueryProvider } from "@/src/shared/providers/QueryProvider";
import type { NotificationResponse } from "expo-notifications";
import {
    addNotificationListeners,
    openNotificationUrlIfAny,
} from "@/src/modules/notifications/push";

export default function Root() {
    validateRequiredConfig();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryProvider>
                    <ThemeProvider>
                        <StatusBar barStyle="light-content" />
                        <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                            <ApiProvider>
                                <SessionProvider>
                                    <PurchasesProvider>
                                        <SplashScreenController />
                                        <RootNavigator />
                                    </PurchasesProvider>
                                </SessionProvider>
                            </ApiProvider>
                        </Auth0Provider>
                    </ThemeProvider>
                </QueryProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function RootNavigator() {
    useConsentGDPR();

    const { handleNavigationWithAd } = useNavigationInterstitial();

    const handleNotificationRespond = useCallback(
        (response: NotificationResponse) => {
            const data = response.notification.request.content.data;
            openNotificationUrlIfAny(data, handleNavigationWithAd);
        },
        [handleNavigationWithAd],
    );

    useEffect(() => {
        const remove = addNotificationListeners({ onRespond: handleNotificationRespond });
        return remove;
    }, [handleNotificationRespond]);

    const {
        isAuthenticated,
        isGuest,
        isMaintenance,
        maintenanceBypass,
        isUpdateRequired,
        updateBypass,
    } = useSessionState();

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

                <Stack.Protected guard={!!isBlockedByUpdate && !isBlockedByMaintenance}>
                    <Stack.Screen
                        name="update-required"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={!(isGuest || isAuthenticated) && !isGloballyBlocked}>
                    <Stack.Screen
                        name="sign-in"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={!!(isGuest || isAuthenticated) && !isGloballyBlocked}>
                    <Stack.Protected guard={!hasCompletedOnboarding}>
                        <Stack.Screen
                            name="onboarding"
                            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
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
