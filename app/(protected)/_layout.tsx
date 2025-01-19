import HomeHeader from "@/modules/home/components/Header";

import React, { useEffect } from "react";
import { View, ActivityIndicator, Button } from "react-native";

import { router, Stack } from "expo-router";
import { useAuth0 } from "react-native-auth0";

export default function ProtectedLayout() {
    const { user, isLoading } = useAuth0();

    // Redirects to login screen if user is not connected
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace("/login");
        }
    }, [isLoading, user]);

    // Displays a loading screen during verification
    if (isLoading || !user) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            {/* Main screen (home) */}
            <Stack.Screen
                name="home"
                options={{
                    headerShown: true,
                    header: () => <HomeHeader />,
                }}
            />

            {/* Modal screen to display match details */}
            <Stack.Screen
                name="match"
                options={{
                    presentation: "modal",
                    headerTransparent: true,
                    headerLeft: () => (
                        <Button title="Fermer" onPress={() => router.back()} />
                    ),
                }}
            />

            {/* Profile screen */}
            <Stack.Screen
                name="profile"
                options={{
                    headerShown: true,
                }}
            />
        </Stack>
    );
}
