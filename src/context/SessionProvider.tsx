import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth0, User } from "react-native-auth0";
import { useQueryClient } from "@tanstack/react-query";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";
import type { CustomUser } from "@/src/types/User";
import { registerForPushNotificationsAsync } from "../utils/notifications";
import { useOnboardingStore } from "../utils/onboardingStore";
import { useGuestSessionStore } from "../utils/guestSessionStore";
import { useApis } from "@/src/context/ApiProvider";
import { setAuthOnApis } from "@/src/api";
import { router, usePathname } from "expo-router";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useRegisterPushToken } from "../hooks/notification/useRegisterPushToken";
import { useAppStatus } from "@/src/hooks/config/app/useAppStatus";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import type { AppStatusDTO } from "@/src/types/AppStatus";

export type SessionActions = {
    signIn: () => Promise<void>;
    continueAsGuest: () => void;
    leaveGuest: () => Promise<void>;
    signOutLocal: () => Promise<void>;
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    softResetAuth: () => Promise<void>;
    bypassMaintenance: () => void;
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

    appStatus: AppStatusDTO | undefined;
    appStatusLoading: boolean;
    appStatusError: boolean;
    appStatusLoaded: boolean;
    maintenanceEnabled: boolean;
    maintenanceBypass: boolean;
    canBypassMaintenance: boolean;
    appReady: boolean;
    refetchAppStatus: () => void;
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

    const {
        data: customUser,
        isLoading: isCustomUserLoading,
        error: customUserError,
        refetch,
    } = useEnsureUser();

    const queryClient = useQueryClient();
    const { hasCompletedOnboarding } = useOnboardingStore();
    const pathname = usePathname();
    const apis = useApis();
    const registerPushToken = useRegisterPushToken();

    const isGuest = useGuestSessionStore((s) => s.isGuest);
    const setGuest = useGuestSessionStore((s) => s.continueAsGuest);
    const leaveGuestFlag = useGuestSessionStore((s) => s.leaveGuest);

    const {
        data: appStatus,
        isLoading: appStatusLoading,
        isError: appStatusError,
        refetch: refetchAppStatus,
    } = useAppStatus();

    const { allowed: canBypassMaintenance } = useHasScopes(["update:maintenance"]);
    const [maintenanceBypass, setMaintenanceBypass] = useState(false);

    const maintenanceEnabled = appStatus?.maintenance === true;

    useEffect(() => {
        if (!maintenanceEnabled && maintenanceBypass) {
            setMaintenanceBypass(false);
        }
    }, [maintenanceEnabled, maintenanceBypass]);

    const bypassMaintenance = () => setMaintenanceBypass(true);

    const appStatusLoaded = !!appStatus || appStatusError;

    const isLoading = isAuth0UserLoading || isCustomUserLoading;
    const isError = !!auth0UserError || !!customUserError;
    const isAuthenticated = !!auth0User && !!customUser;
    const error = customUserError || auth0UserError;

    const appReady = !isLoading && appStatusLoaded;

    useEffect(() => {
        if (!hasCompletedOnboarding || !isAuthenticated) return;
        (async () => {
            try {
                const token = await registerForPushNotificationsAsync().catch(() => null);
                if (customUser?.id && token) {
                    await registerPushToken(customUser.id, token).catch(() => {});
                }
            } catch (err) {
                console.warn("Erreur lors de l’enregistrement du push token :", err);
            }
        })();
    }, [isAuthenticated, hasCompletedOnboarding, customUser?.id, registerPushToken]);

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
    }, [getCredentials, apis, refetch]);

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
            } catch {}
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
        if (pathname === "/profile") router.push("/(tabs)/(feed)");
    };

    const continueAsGuest = () => {
        setAuthOnApis(apis, undefined, undefined);
        setGuest();
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

    const signOutSSO = async (opts?: { federated?: boolean }) => {
        try {
            if (isGuest) {
                await leaveGuest();
                return;
            }
            await clearSession(opts);
            await clearRQCache();
        } catch (err) {
            console.warn("Erreur inattendue lors du logout SSO :", err);
        }
    };

    const value = useMemo<SessionContextValue>(
        () => ({
            signIn,
            continueAsGuest,
            leaveGuest,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            bypassMaintenance,

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

            appStatus,
            appStatusLoading,
            appStatusError,
            appStatusLoaded,
            maintenanceEnabled,
            maintenanceBypass,
            canBypassMaintenance,
            appReady,
            refetchAppStatus,
        }),
        [
            signIn,
            continueAsGuest,
            leaveGuest,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            bypassMaintenance,
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
            appStatus,
            appStatusLoading,
            appStatusError,
            appStatusLoaded,
            maintenanceEnabled,
            maintenanceBypass,
            canBypassMaintenance,
            appReady,
            refetchAppStatus,
        ]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};