import React, { createContext, useContext, useMemo } from 'react';
import { useSession } from '@/src/context/SessionProvider';
import { useCurrentUser } from '@/src/hooks/user/useCurrentUser';
import { CustomUser } from '../types/User';

export interface UserContextValue {
    customUser: CustomUser | null | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useSession();
    const { data: customUser, isLoading: isCustomUserLoading, error, refetch } = useCurrentUser({ enabled: session });

    const value = useMemo<UserContextValue>(
        () => ({
            customUser: session ? customUser ?? null : null,
            isLoading: session ? isCustomUserLoading : false,
            error,
            refetch,
        }),
        [session, customUser, isCustomUserLoading, error, refetch]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
    return ctx;
};