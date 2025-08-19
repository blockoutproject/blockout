// src/app/index.tsx
import React from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useSession } from "@/src/context/SessionProvider";
import { useUserContext } from "@/src/context/UserProvider";
import { useAppTheme } from "@/src/context/ThemeProvider";

export default function Index() {
    const { authenticated, isLoading: authLoading } = useSession();
    const { userReady, isLoading: userLoading } = useUserContext();

    const ready = authenticated && userReady && !authLoading && !userLoading;

    return <Redirect href={ready ? "/(app)" : "/sign-in"} />;
}