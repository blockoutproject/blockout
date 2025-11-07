import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth0, User } from "react-native-auth0";
import { useQueryClient } from "@tanstack/react-query";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";
import type { CustomUser } from "@/src/types/User";
import { registerForPushNotificationsAsync, registerPushTokenOnBackend } from "../utils/notifications";
import { useOnboardingStore } from "../utils/onboardingStore";
import { useGuestSessionStore } from "../utils/guestSessionStore";
import { useApis } from "@/src/context/ApiProvider";
import { setAuthOnApis } from "@/src/api";
import { router, useNavigation } from "expo-router";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export type SessionActions = {
    signIn: () => Promise<void>;
    continueAsGuest: () => void;
    leaveGuest: () => Promise<void>;
    signOutLocal: () => Promise<void>;
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    softResetAuth: () => Promise<void>;
};

export type SessionUserState = {
    auth0User: User | null;
    customUser: CustomUser | undefined;
    isLoading: boolean;
    isError: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    error: Error | null;
    customUserError: Error | null;
    auth0UserError: Error | null;
    refetch: () => void;
};

export type SessionContextValue = SessionActions & SessionUserState;

const SessionContext = createContext<SessionContextValue | null>(null);
export const useSession = () => {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
    return ctx;
};

type TabsNav = BottomTabNavigationProp<any>;


export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const {
        authorize,
        clearSession,
        clearCredentials,
        getCredentials,
        user: auth0User,
        error: auth0UserError,
        isLoading: isAuth0UserLoading,
    } = useAuth0();

    const { data: customUser, isLoading: isCustomUserLoading, error: customUserError, refetch } = useEnsureUser();
    const queryClient = useQueryClient();
    const { hasCompletedOnboarding } = useOnboardingStore();
    const navigation = useNavigation<TabsNav>();
    const apis = useApis();

    const isGuest = useGuestSessionStore((s) => s.isGuest);
    const setGuest = useGuestSessionStore((s) => s.continueAsGuest);
    const leaveGuestFlag = useGuestSessionStore((s) => s.leaveGuest);

    const isLoading = isAuth0UserLoading || isCustomUserLoading;
    const isError = !!auth0UserError || !!customUserError;
    const isAuthenticated = !!auth0User && !!customUser;
    const error = customUserError || auth0UserError;

    useEffect(() => {
        if (!hasCompletedOnboarding || !isAuthenticated || !customUser) return;
        (async () => {
            try {
                const token = await registerForPushNotificationsAsync().catch(() => null);
                if (customUser.id && token) {
                    await registerPushTokenOnBackend(customUser.id, token).catch(() => { });
                }
            } catch (err) {
                console.warn("Erreur lors de l’enregistrement du push token :", err);
            }
        })();
    }, [isAuthenticated, customUser, hasCompletedOnboarding]);

    // Dans SessionProvider
    useEffect(() => {
        let cancelled = false;

        const bootstrapAuth = async () => {
            try {
                const creds = await getCredentials(undefined, 60).catch(() => null);
                if (cancelled) return;

                if (creds?.accessToken) {
                    await primeApisWithAuth();
                    await refetch();
                } else {
                    setAuthOnApis(apis, undefined, undefined);
                }
            } catch (err) {
                console.warn("[Session] bootstrapAuth failed:", err);
                setAuthOnApis(apis, undefined, undefined);
            }
        };

        bootstrapAuth();
        return () => {
            cancelled = true;
        };
    }, []);

    const clearRQCache = async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
    };

    const primeApisWithAuth = async () => {
        const tokenSupplier = async () => {
            const creds = await getCredentials(undefined, 60);
            return creds?.accessToken ?? null;
        };

        const onUnauthorized = async () => {
            try {
                await clearCredentials();
                await clearRQCache();
            } catch {
                /* ignore */
            }
        };

        setAuthOnApis(apis, tokenSupplier, onUnauthorized);
    };

    const signIn = async () => {
        await authorize({
            audience: "https://api.blockoutproject.com/",
            scope: "openid profile email offline_access",
        });

        await primeApisWithAuth();

        await refetch();

        if (isGuest) leaveGuestFlag();

        router.push("/(tabs)/(feed)");
        console.log("[Session] Sign-in successful");
    };

    const continueAsGuest = () => {
        setAuthOnApis(apis, undefined, undefined);
        setGuest();
        console.log("[Session] Continue as guest");
    };

    const leaveGuest = async () => {
        leaveGuestFlag();
        await clearRQCache();
    };

    const softResetAuth = async () => {
        try {
            await clearCredentials();
            setAuthOnApis(apis, undefined, undefined);
            await clearRQCache();
        } catch (err) {
            console.warn("Erreur inattendue lors du softResetAuth :", err);
        }
    };

    const signOutLocal = async () => {
        if (isGuest) {
            await leaveGuest();
            return;
        }
        await softResetAuth();
    };

    const signOutSSO = async () => {
        try {
            if (isGuest) {
                await leaveGuest();
                return;
            }
            await clearSession();
            await clearRQCache();
        } catch (err) {
            console.warn("Erreur inattendue lors du logout SSO :", err);
        }
    };

    useEffect(() => {
        if (isError && error) {
            console.log("[Session Error]", error);
        }
    }, [error, isError]);

    const value = useMemo<SessionContextValue>(
        () => ({
            signIn,
            continueAsGuest,
            leaveGuest,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            auth0User,
            customUser,
            isAuthenticated,
            isGuest,
            isLoading,
            isError,
            refetch,
            error,
            customUserError,
            auth0UserError,
        }),
        [
            auth0User,
            customUser,
            isLoading,
            isError,
            isAuthenticated,
            isGuest,
            refetch,
            customUserError,
            auth0UserError,
            error,
        ]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};