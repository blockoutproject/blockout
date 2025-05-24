import { ThemeProvider } from "@/src/context/ThemeProvider";
import React from "react";
import { useColorScheme } from "react-native";
import { ApiProvider } from "@/src/context/ApiProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Auth0Provider } from "react-native-auth0";
import { AUTH0_CONFIG } from "../config/config";
import { DevToolsBubble } from "react-native-react-query-devtools";
import * as Clipboard from "expo-clipboard";
import { UserProvider } from "@/src/context/UserProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const RootLayout: React.FC = () => {
    const queryClient = new QueryClient();

    const onCopy = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <GestureHandlerRootView>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                        <ApiProvider>
                            <UserProvider>
                                <Stack screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="(auth)" />
                                    <Stack.Screen name="(protected)" />
                                </Stack>
                            </UserProvider>
                        </ApiProvider>
                    </Auth0Provider>
                </ThemeProvider>
                <DevToolsBubble onCopy={onCopy} />
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
};

export default RootLayout;