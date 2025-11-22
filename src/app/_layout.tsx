import React, { useEffect } from "react";
import { StatusBar, View, Text } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "react-native-auth0";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG } from "@/src/config/config";
import { ThemeProvider } from "@/src/theme/theme-provider";
import { ApiProvider } from "@/src/context/ApiProvider";
import { SessionProvider, useSession } from "@/src/context/SessionProvider";
import { SplashScreenController } from "@/src/components/splash/SplashScreen";
import { useOnboardingStore } from "../utils/onboardingStore";
import { addNotificationListeners, openNotificationUrlIfAny } from "../utils/notifications";
import MaintenanceScreen from "../components/maintenance/MaintenanceScreen";

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
    const { isAuthenticated, isGuest, isMaintenance, maintenanceBypass } = useSession();
    const { hasCompletedOnboarding } = useOnboardingStore();

    // console.log("-------------")
    // console.log("1", (isMaintenance && !maintenanceBypass))
    // console.log("2", !(isGuest || isAuthenticated) && !isMaintenance)
    // console.log("3", (isGuest || isAuthenticated) && !isMaintenance)

    //if (!appReady) return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'green'}}><Text style={{color: 'white'}}>çznbrvpnqzr^pknvjopzrç^vinozr</Text></View>;

    return (
        <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Protected guard={(isMaintenance && !maintenanceBypass)}>
                    <Stack.Screen
                        name="maintenance"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={!(isGuest || isAuthenticated) && !isMaintenance}>
                    <Stack.Screen
                        name="sign-in"
                        options={{ animation: "fade_from_bottom", animationDuration: 300 }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={(isGuest || isAuthenticated) && !isMaintenance}>
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