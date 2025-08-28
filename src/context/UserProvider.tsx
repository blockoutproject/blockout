import React, { createContext, useContext, useEffect, useMemo } from "react";
import type { CustomUser } from "@/src/types/User";
import { useSession } from "@/src/context/SessionProvider";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";
import { ApiError } from "@/src/api/AbstractApi";

export interface UserContextValue {
    customUser: CustomUser | null;
    isLoading: boolean;
    userReady: boolean;
    error: ApiError | null;
    refetch: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const useUserContext = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUserContext must be used within a UserProvider");
    return ctx;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, softResetAuth } = useSession();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useEnsureUser({ enabled: authenticated });

    useEffect(() => {
        if (!authenticated || !error) return;
        if (error) {
            softResetAuth();
        }
    }, [authenticated, error, softResetAuth]);

    const value = useMemo<UserContextValue>(() => {
        const customUser = authenticated ? (data ?? null) : null;
        const userReady = !!customUser && !isLoading;
        return {
            customUser,
            isLoading: authenticated ? isLoading : false,
            userReady,
            error: (error as ApiError) ?? null,
            refetch,
        };
    }, [authenticated, data, isLoading, error, refetch]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};