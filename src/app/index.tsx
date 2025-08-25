import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "@/src/context/SessionProvider";
import { useUserContext } from "@/src/context/UserProvider";

export default function Index() {
    const { authenticated, isLoading: authLoading } = useSession();
    const { userReady, isLoading: userLoading } = useUserContext();

    const ready = authenticated 
        && userReady 
        && !authLoading 
        && !userLoading;

    return (
        <Redirect href={ready ? "/(tabs)/(feed)" : "/sign-in"} />
    );
}