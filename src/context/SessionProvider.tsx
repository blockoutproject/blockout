import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import { useAuth0 } from 'react-native-auth0';

type SessionValue = {
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    session: boolean;
    isLoading: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession must be used within a <SessionProvider>');
    return ctx;
}

export function SessionProvider({ children }: PropsWithChildren) {
    const { user, isLoading, authorize, clearSession } = useAuth0();
    const qc = useQueryClient();

    const session = !!user;

    const signIn = async () => {
        await authorize(
            {
                audience: 'https://api.blockoutproject.com/',
            },
            { useSFSafariViewController: true }
        );
    };

    const signOut = async () => {
        await clearSession();
        qc.clear()
    };

    const value = useMemo(
        () => ({ signIn, signOut, session, isLoading }),
        [session, isLoading]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}