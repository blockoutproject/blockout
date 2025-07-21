import React from "react";
import { StatusBar } from "react-native";
import { ApiProvider } from "@/src/context/ApiProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundaryProps, Stack } from "expo-router";
import { Auth0Provider } from "react-native-auth0";
import { AUTH0_CONFIG } from "../config/config";
import { DevToolsBubble } from "react-native-react-query-devtools";
import * as Clipboard from "expo-clipboard";
import { UserProvider } from "@/src/context/UserProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import ErrorFallback from "../components/common/ErrorFallback";
import { ThemeProvider } from "../theme/theme-provider";
import { useThemeColor } from "../hooks/useThemeColor";

export function ErrorBoundary(props: ErrorBoundaryProps) {
    return <ErrorFallback {...props} />;
}

const RootLayout: React.FC = () => {
    const queryClient = new QueryClient();
    const theme = useThemeColor({}, "background");

    // const onCopy = async (text: string) => {
    //     try {
    //         await Clipboard.setStringAsync(text);
    //         return true;
    //     } catch {
    //         return false;
    //     }
    // };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <StatusBar
                        barStyle={"light-content"}
                        backgroundColor={theme}
                    />
                    <Auth0Provider domain={AUTH0_CONFIG.domain} clientId={AUTH0_CONFIG.clientId}>
                        <ApiProvider>
                            <UserProvider>
                                <BottomSheetModalProvider>
                                    <Stack screenOptions={{ headerShown: false }}>
                                        <Stack.Screen name="(auth)" />
                                        <Stack.Screen name="(protected)" />
                                    </Stack>
                                </BottomSheetModalProvider>
                            </UserProvider>
                        </ApiProvider>
                    </Auth0Provider>
                </ThemeProvider>
                {/* <DevToolsBubble onCopy={onCopy} /> */}
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
};

export default RootLayout;