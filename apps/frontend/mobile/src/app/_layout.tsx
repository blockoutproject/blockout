import React, { useCallback, useEffect } from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { Auth0Provider } from "react-native-auth0";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG } from "@/src/config/config";
import { ThemeProvider } from "@/src/theme/theme-provider";
import { ApiProvider } from "@/src/context/ApiProvider";
import { SessionProvider, useSession } from "@/src/context/SessionProvider";
import { TanstackQueryProvider } from "@/src/context/TanstackQueryProvider";
import { SplashScreenController } from "@/src/components/splash/SplashScreen";
import { useOnboardingStore } from "../utils/onboardingStore";
import { addNotificationListeners, openNotificationUrlIfAny } from "../utils/notifications";
import { useNavigationInterstitial } from "../hooks/ads/useNavigationInterstitial";
import { useConsentGDPR } from "../hooks/ads/useConsentGDPR";
import { PurchasesProvider } from "../context/PurchasesProvider";

/**
 * Composes the application-wide mobile providers around the root navigator.
 *
 * @returns The Expo application root.
 */
export default function Root() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <TanstackQueryProvider>
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
            </TanstackQueryProvider>
        </GestureHandlerRootView>
    );
}

/**
 * Renders the protected route tree from session, update, maintenance, and onboarding state.
 *
 * @returns The root Expo Router stack.
 */
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

                <Stack.Protected guard={isBlockedByUpdate && !isBlockedByMaintenance}>
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

                <Stack.Protected guard={(isGuest || isAuthenticated) && !isGloballyBlocked}>
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
