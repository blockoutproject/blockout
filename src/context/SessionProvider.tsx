import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth0 } from "react-native-auth0";
import { useQueryClient } from "@tanstack/react-query";

type SessionValue = {
    signIn: () => Promise<void>;
    signOut: (opts?: { federated?: boolean }) => Promise<void>;
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
                    try { await getCredentials("openid profile email", 60); } catch { }
                }
            } finally {
                if (alive) setChecking(false);
            }
        })();
        return () => { alive = false; };
    }, [getCredentials]);

    const signIn = async () => {
        await authorize(
            { audience: 'https://api.blockoutproject.com/', scope: 'openid profile email offline_access' },
            { useSFSafariViewController: true }
        );
        setAuthenticated(true);
    };

    const softResetAuth = async () => {
        try { await clearCredentials(); } catch { }
        qc.clear();
        setAuthenticated(false);
    };

    const signOut = async (opts?: { federated?: boolean }) => {
        try { await clearSession({ federated: !!opts?.federated }); } catch { }
        await softResetAuth();
    };

    const value = useMemo(
        () => ({
            signIn,
            signOut,
            softResetAuth,
            authenticated,
            isLoading: checking,
        }),
        [authenticated, checking]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}