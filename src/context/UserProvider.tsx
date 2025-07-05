import { createContext, useContext, useEffect, useMemo } from "react";
import { useCustomUser } from "../hooks/user/useUser";
import { useAuth0 } from "react-native-auth0";
import { UserContextValue } from "../types/User";

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: auth0User, isLoading: isAuth0Loading } = useAuth0();
    const {
        data: customUser,
        isLoading: isCustomUserLoading,
        error,
        refetch
    } = useCustomUser(auth0User?.sub);

    useEffect(() => {
        console.log('[UserContext] customUser mis à jour:', customUser);
    }, [customUser]);

    const isLoading = isAuth0Loading || isCustomUserLoading;

    const value = useMemo(() => ({
        auth0User,
        customUser,
        isLoading,
        error,
        refetch,
    }), [auth0User, customUser, isLoading, error, refetch]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
}