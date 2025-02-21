import { colors } from "@/constants/Colors";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { ApiProvider } from "@/context/ApiClientProvider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Auth0Provider } from "react-native-auth0";
import { auth0Config } from "../config/auth-config";
import { DevToolsBubble } from "react-native-react-query-devtools";
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider } from "react-native-safe-area-context";

const RootLayout: React.FC = () => {

    const queryClient = new QueryClient();

    const colorScheme = useColorScheme();

    StatusBar.setBackgroundColor(
        colorScheme == "dark" ? colors.dark : colors.light
    );
    StatusBar.setBarStyle(
        colorScheme == "dark" ? "light-content" : "dark-content"
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
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
                <SafeAreaProvider>
                    <Auth0Provider
                        domain={auth0Config.domain}
                        clientId={auth0Config.clientId}
                    >
                        <ApiProvider>
                            <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
                                <Stack screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="(auth)" />
                                    <Stack.Screen name="(protected)" />
                                    <Stack.Screen name="+not-found" />
                                </Stack>
                            </SafeAreaView>
                        </ApiProvider>
                    </Auth0Provider>
                </SafeAreaProvider>
            </ThemeProvider>
            <DevToolsBubble onCopy={onCopy} />
        </QueryClientProvider >
    );
}

export default RootLayout;
