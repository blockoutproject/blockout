import React, { useCallback, useEffect } from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "@/src/shared/providers/AuthProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG } from "@/src/shared/config/config";
import { ThemeProvider } from "@/src/shared/theme/theme-provider";
import { ApiProvider } from "@/src/shared/providers/ApiProvider";
import { SessionProvider, useSession } from "@/src/shared/providers/SessionProvider";
import { SplashScreenController } from "@/src/components/splash/SplashScreen";
import { useOnboardingStore } from "../utils/onboardingStore";
import { addNotificationListeners, openNotificationUrlIfAny } from "../utils/notifications";
import { useNavigationInterstitial } from "../hooks/ads/useNavigationInterstitial";
import { useConsentGDPR } from "../hooks/ads/useConsentGDPR";
import { PurchasesProvider } from "@/src/shared/providers/PurchasesProvider";

const queryClient = new QueryClient();

export default function Root() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
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
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function RootNavigator() {
    useConsentGDPR();

    const { handleNavigationWithAd } = useNavigationInterstitial();

    const handleNotificationRespond = useCallback(
        (response: any) => {
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
