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
import { useRegisterPushToken } from "../hooks/notification/useRegisterPushToken";
import { useAppStatus } from "@/src/hooks/config/app/useAppStatus";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import type { AppStatusDTO } from "@/src/types/AppStatus";
import { computeIsUpdateRequired, getStoreUrl } from "@/src/utils/appVersion";
import { ApiError } from "../api/core/ApiError";

export type SessionActions = {
    signIn: () => Promise<void>;
    continueAsGuest: () => void;
    leaveGuest: () => Promise<void>;
    signOutLocal: () => Promise<void>;
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    softResetAuth: () => Promise<void>;
    bypassMaintenance: () => void;
    resetBypassMaintenance: () => void;
    bypassUpdate: () => void;
    resetBypassUpdate: () => void;
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
    isAppStatusLoading: boolean;
    isAppStatusError: boolean;
    isMaintenance: boolean;
    maintenanceBypass: boolean;
    canBypassMaintenance: boolean;
    isUpdateRequired: boolean;
    updateBypass: boolean;
    canBypassUpdate: boolean;
    appUpdateUrl: string | null;
    refetchAppStatus: () => void;
    isBootstrapped: boolean;
};

export type SessionContextValue = SessionActions & SessionUserState;

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = () => {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
    return ctx;
};

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
        isLoading: isAppStatusLoading,
        isError: isAppStatusError,
        refetch: refetchAppStatus,
    } = useAppStatus();

    const { allowed: canBypassAppStatus } = useHasScopes(["update:maintenance"]);

    const [maintenanceBypass, setMaintenanceBypass] = useState(false);
    const [updateBypass, setUpdateBypass] = useState(false);
    const [isBootstrapped, setIsBootstrapped] = useState(false);

    const isMaintenance = appStatus?.maintenance === true;
    const isUpdateRequired = useMemo(() => computeIsUpdateRequired(appStatus), [appStatus]);
    const appUpdateUrl = useMemo(() => getStoreUrl(appStatus), [appStatus]);

    useEffect(() => {
        if (!isMaintenance && maintenanceBypass) setMaintenanceBypass(false);
    }, [isMaintenance, maintenanceBypass]);

    useEffect(() => {
        if (!isUpdateRequired && updateBypass) setUpdateBypass(false);
    }, [isUpdateRequired, updateBypass]);

    const isLoading = isAuth0UserLoading || isCustomUserLoading || isAppStatusLoading;
    const isError = !!auth0UserError || !!customUserError || isAppStatusError;
    const isAuthenticated = !!auth0User && !!customUser;
    const error = customUserError || auth0UserError;

    useEffect(() => {
        if (!hasCompletedOnboarding || !isAuthenticated) return;
        (async () => {
            try {
                const token = await registerForPushNotificationsAsync().catch(() => null);
                if (customUser?.id && token) {
                    await registerPushToken(customUser.id, token).catch(() => { });
                }
            } catch { }
        })();
    }, [isAuthenticated, hasCompletedOnboarding, customUser?.id]);

    useEffect(() => {
        let cancelled = false;

        const bootstrapAuth = async () => {
            try {
                const creds = await getCredentials(undefined, 60).catch(() => null);

                if (creds?.accessToken) {
                    await primeApisWithAuth();
                    await refetch();
                } else {
                    setAuthOnApis(apis, undefined, undefined);
                }
            } catch {
                setAuthOnApis(apis, undefined, undefined);
            } finally {
                if (!cancelled) setIsBootstrapped(true);
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

        const onUnauthorized = async (err: ApiError) => {
            try {
                await clearCredentials();
                await clearRQCache();
            } catch { }
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
        } catch { }
    };

    const signOutLocal = async () => {
        if (isGuest) return leaveGuest();
        await softResetAuth();
        setMaintenanceBypass(false);
        setUpdateBypass(false);
    };

    const signOutSSO = async (opts?: { federated?: boolean }) => {
        try {
            if (isGuest) return leaveGuest();
            await clearSession(opts);
            await clearRQCache();
            setMaintenanceBypass(false);
            setUpdateBypass(false);
        } catch { }
    };

    const value = useMemo<SessionContextValue>(
        () => ({
            signIn,
            continueAsGuest,
            leaveGuest,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            bypassMaintenance: () => setMaintenanceBypass(true),
            resetBypassMaintenance: () => setMaintenanceBypass(false),
            bypassUpdate: () => setUpdateBypass(true),
            resetBypassUpdate: () => setUpdateBypass(false),
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
            isAppStatusLoading,
            isAppStatusError,
            isMaintenance,
            maintenanceBypass,
            canBypassMaintenance: canBypassAppStatus,
            isUpdateRequired,
            updateBypass,
            canBypassUpdate: canBypassAppStatus,
            appUpdateUrl,
            refetchAppStatus,
            isBootstrapped,
        }),
        [
            auth0User,
            customUser,
            isAuthenticated,
            isGuest,
            isLoading,
            isError,
            error,
            customUserError,
            auth0UserError,
            appStatus,
            isAppStatusLoading,
            isAppStatusError,
            isMaintenance,
            maintenanceBypass,
            canBypassAppStatus,
            isUpdateRequired,
            updateBypass,
            appUpdateUrl,
            refetchAppStatus,
            isBootstrapped,
        ],
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};