import React from "react";

export type User = {
  sub?: string;
  [claim: string]: unknown;
};

type Auth0ProviderProps = React.PropsWithChildren<{
  domain: string;
  clientId: string;
}>;

/**
 * Authentication remains native-only during mobile characterization.
 * The local web surface exercises the public and guest flows only.
 */
export const Auth0Provider: React.FC<Auth0ProviderProps> = ({ children }) => (
  <>{children}</>
);

export const useAuth0 = () => ({
  authorize: async () => {
    throw new Error("Authentication is only available in native builds.");
  },
  clearSession: async () => {},
  clearCredentials: async () => {},
  getCredentials: async () => null,
  user: null as User | null,
  error: null as Error | null,
  isLoading: false,
});
