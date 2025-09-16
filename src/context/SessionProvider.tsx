import React, { createContext, use, useContext, useEffect, useMemo } from "react";
import { useAuth0, User } from "react-native-auth0";
import type { CustomUser } from "@/src/types/User";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";

/** Actions d'auth exposées */
export type SessionActions = {
    signIn: () => Promise<void>;
    /** Logout local (app only, pas de pop-up iOS) */
    signOutLocal: () => Promise<void>;
    /**
     * Logout SSO (serveur) => ouvre le navigateur et peut afficher l’alerte iOS.
     * - federated: true pour forcer la déconnexion des IdP fédérés (si besoin).
     */
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    /** Efface uniquement les credentials locaux */
    softResetAuth: () => Promise<void>;
};

/** État utilisateur exposé */
export type SessionUserState = {
    /** Utilisateur Auth0 brut (peut être undefined tant qu’on n’a pas d’info) */
    auth0User: User | null;
    /** Ton utilisateur côté back */
    customUser: CustomUser | undefined;

    /** Chargement global (Auth0 OU custom user) */
    isLoading: boolean;
    /** Erreur globale (Auth0 OU custom user) */
    isError: boolean;
    /** Prêt à l’usage (on a auth0User ET customUser) */
    isReady: boolean;

    /** Erreurs détaillées */
    error: Error | null;
    customUserError: Error | null;
    auth0UserError: Error | null;

    /** Forcer un refetch du CustomUser */
    refetch: () => void;
};

export type SessionContextValue = SessionActions & SessionUserState;

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = () => {
    const c = useContext(SessionContext);
    if (!c) throw new Error("useSession must be used within <SessionProvider>");
    return c;
};

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const {
        authorize,
        clearSession,
        clearCredentials,
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

    const isLoading = isAuth0UserLoading || isCustomUserLoading;
    const isError = !!auth0UserError || !!customUserError;
    const isReady = !!customUser && !!auth0User;
    const error = customUserError || auth0UserError;

    useEffect(() => {
        if (isReady && isError) {
            softResetAuth();
        }
    }, [isReady, isError]);

    const signIn = async () => {
        await authorize({
            audience: "https://api.blockoutproject.com/",
            scope: "openid profile email offline_access",
        });
    };

    const softResetAuth = async () => {
        await clearCredentials();
    };

    const signOutLocal = async () => {
        await softResetAuth();
    };

    const signOutSSO = async (opts?: { federated?: boolean }) => {
        try {
            await clearSession({ federated: opts?.federated });
            await softResetAuth();
        } catch (e) {
            throw e;
        }
    };

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