import React from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "react-native-auth0";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AUTH0_CONFIG } from "@/src/config/config";
import { ThemeProvider } from "@/src/theme/theme-provider";
import { useThemeColor } from "@/src/hooks/useThemeColor";

import { ApiProvider } from "@/src/context/ApiProvider";
import { UserProvider, useUserContext } from "@/src/context/UserProvider";
import { SessionProvider, useSession } from "@/src/context/SessionProvider";
import { SplashScreenController } from "@/src/session/splash";

const queryClient = new QueryClient();

export default function Root() {
    const bg = useThemeColor({}, "background");
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <StatusBar barStyle={"light-content"} backgroundColor={bg} />
                    <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                        <SessionProvider>
                            <ApiProvider>
                                <UserProvider>
                                    <SplashScreenController />
                                    <RootNavigator />
                                </UserProvider>
                            </ApiProvider>
                        </SessionProvider>
                    </Auth0Provider>
                </ThemeProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}

function RootNavigator() {
    const { authenticated, isLoading: authLoading } = useSession();
    const { userReady, isLoading: userLoading } = useUserContext();

    const ready = authenticated && !authLoading && userReady && !userLoading;

    return (
        <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Protected guard={ready}>
                    <Stack.Screen name="(app)" options={{ animation: "fade_from_bottom", animationDuration: 300 }} />
                </Stack.Protected>

                <Stack.Protected guard={!ready}>
                    <Stack.Screen name="sign-in" options={{ animation: "fade_from_bottom", animationDuration: 300 }} />
                </Stack.Protected>
            </Stack>
        </BottomSheetModalProvider>
    );
}