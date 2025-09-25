import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth0, User } from "react-native-auth0";
import { useQueryClient } from "@tanstack/react-query";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";
import type { CustomUser } from "@/src/types/User";

export type SessionActions = {
    signIn: () => Promise<void>;
    signOutLocal: () => Promise<void>;
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    softResetAuth: () => Promise<void>;
};

export type SessionUserState = {
    auth0User: User | null;
    customUser: CustomUser | undefined;
    isLoading: boolean;
    isError: boolean;
    isReady: boolean;
    error: Error | null;
    customUserError: Error | null;
    auth0UserError: Error | null;
    refetch: () => void;
};

export type SessionContextValue = SessionActions & SessionUserState;

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = () => {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error("useSession must be used within <SessionProvider>");
    }
    return ctx;
};

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { authorize, clearSession, clearCredentials, user: auth0User, error: auth0UserError, isLoading: isAuth0UserLoading } = useAuth0();
    const { data: customUser, isLoading: isCustomUserLoading, error: customUserError, refetch } = useEnsureUser();
    const queryClient = useQueryClient();

    const isLoading = isAuth0UserLoading || isCustomUserLoading;
    const isError = !!auth0UserError || !!customUserError;
    const isReady = !!customUser && !!auth0User;
    const error = customUserError || auth0UserError;

    const clearRQCache = async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
    };

    const signIn = async () => {
        await authorize({
            audience: "https://api.blockoutproject.com/",
            scope: "openid profile email offline_access",
        });
    };

    const softResetAuth = async () => {
        console.log("Soft resetting auth");
        await clearCredentials();
        await clearRQCache();
    };

    const signOutLocal = async () => {
        console.log("Signing out locally");
        await softResetAuth();
    };

    const signOutSSO = async () => {
        console.log("Signing out SSO");
        await clearSession();
        console.log("Cleared session", customUser, auth0User);
        await clearRQCache();
    };

    useEffect(() => {
        console.log("Session state changed:", { isReady, isError, error, customUser, auth0User });
        if (isReady && isError) {
            softResetAuth();
        }
    }, [isReady, isError]);

    const value = useMemo<SessionContextValue>(() => {
        return {
            signIn,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            auth0User,
            customUser,
            isLoading,
            isError,
            isReady,
            refetch,
            error,
            customUserError,
            auth0UserError,
        };
    }, [
        auth0User,
        customUser,
        isLoading,
        isError,
        isReady,
        refetch,
        customUserError,
        auth0UserError,
        error,
    ]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};