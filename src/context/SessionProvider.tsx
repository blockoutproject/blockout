import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useAuth0 } from "react-native-auth0";
import { useQueryClient } from "@tanstack/react-query";

type SessionValue = {
    signIn: () => Promise<void>;
    /** Logout local (app only, pas de pop-up iOS) */
    signOutLocal: () => Promise<void>;
    /**
     * Logout SSO (serveur) => ouvre le navigateur et peut afficher l’alerte iOS.
     * - federated: true pour forcer la déconnexion des IdP fédérés (si besoin).
     */
    signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
    softResetAuth: () => Promise<void>;
    authenticated: boolean;
    isLoading: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);
export const useSession = () => {
    const c = useContext(SessionContext);
    if (!c) throw new Error("useSession must be used within <SessionProvider>");
    return c;
};

const isUserCancelled = (err: unknown) => {
    const anyErr = err as any;
    const code = anyErr?.code || anyErr?.error;
    // Android: a0.session.user_cancelled | iOS: USER_CANCELLED | Newer: Authentication.Error.Cancelled
    return (
        code === "a0.session.user_cancelled" ||
        code === "USER_CANCELLED" ||
        code === "Authentication.Error.Cancelled"
    );
};

export function SessionProvider({ children }: React.PropsWithChildren) {
    const { authorize, clearSession, getCredentials, clearCredentials, hasValidCredentials } = useAuth0();
    const qc = useQueryClient();

    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const has = await hasValidCredentials();
                if (!alive) return;
                setAuthenticated(has);

                if (has) {
                    try {
                        // rafraîchit si besoin et charge le profil minimal
                        await getCredentials("openid profile email", 60);
                    } catch { }
                }
            } finally {
                if (alive) setChecking(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [getCredentials, hasValidCredentials]);

    const signIn = async () => {
        try {
            // iOS: ephemeralSession pour éviter l’alerte SSO si tu n’as pas besoin de SSO partagé
            const iosOptions = Platform.OS === "ios" ? { ephemeralSession: true as const } : undefined;
            await authorize(
                { audience: "https://api.blockoutproject.com/", scope: "openid profile email offline_access" },
                iosOptions
            );
            // À ce stade, le SDK a stocké les credentials; on reflète l’état
            setAuthenticated(true);
            try {
                await getCredentials("openid profile email", 60);
            } catch { }
        } catch (e) {
            if (isUserCancelled(e)) {
                // L’utilisateur a annulé -> on ne change pas l’état, pas d’erreur fatale
                return;
            }
            // remonte l’erreur si tu veux l’afficher à l’UI
            throw e;
        }
    };

    const softResetAuth = async () => {
        try {
            await clearCredentials(); // efface uniquement côté app (Keychain/Keystore)
        } catch { }
        qc.clear();
        setAuthenticated(false);
    };

    /** Logout local: aucun appel navigateur, aucune pop-up iOS */
    const signOutLocal = async () => {
        await softResetAuth();
    };

    /** Logout SSO serveur: ouvre le navigateur et peut afficher l’alerte; on respecte l’annulation */
    const signOutSSO = async (opts?: { federated?: boolean }) => {
        try {
            await clearSession({ federated: opts?.federated });
            // Navigateur OK => on purge l’app
            await softResetAuth();
        } catch (e) {
            if (isUserCancelled(e)) {
                // L’utilisateur a annulé la pop-up -> on ne déconnecte PAS localement
                return;
            }
            // autre erreur réseau/config -> à traiter/afficher si besoin
            throw e;
        }
    };

    const value = useMemo(
        () => ({
            signIn,
            signOutLocal,
            signOutSSO,
            softResetAuth,
            authenticated,
            isLoading: checking,
        }),
        [authenticated, checking]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}