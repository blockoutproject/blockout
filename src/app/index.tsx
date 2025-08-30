import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "../context/SessionProvider";

export default function Index() {
    const { isReady } = useSession();

    return (
        <Redirect href={isReady ? "/(tabs)/(feed)" : "/sign-in"} />
    );
}