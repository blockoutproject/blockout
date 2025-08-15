import { Redirect } from "expo-router";
import { useSession } from "@/src/context/SessionProvider";

export default function RootIndex() {
    const { authenticated, isLoading } = useSession();
    if (isLoading) return null;

    return <Redirect href={authenticated ? "/(app)" : "/sign-in"} />;
}