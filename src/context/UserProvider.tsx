import React, { createContext, useContext, useMemo } from 'react';
import { User } from '@/src/types/User';
import { useUser } from '@/src/hooks/user/useUser';

interface UserContextValue {
  user: User | undefined;
  isLoading: boolean;
  error: unknown;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error } = useUser();

  const value = useMemo(() => ({
    user: data,
    isLoading,
    error,
  }), [data, isLoading, error]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}