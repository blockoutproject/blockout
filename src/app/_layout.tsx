import { colors } from "@/src/constants/Colors";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiProvider } from "@/src/context/ApiProvider";
import { useColorScheme } from "@/src/hooks/useColorScheme";
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
    const colorScheme = useColorScheme();

    StatusBar.setBackgroundColor(
        colorScheme === "dark" ? colors.dark : colors.light
    );
    StatusBar.setBarStyle(
        colorScheme === "dark" ? "light-content" : "dark-content"
    );

    const onCopy = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }} edges={["top"]}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
        </SafeAreaView>
    );
};

export default RootLayout;