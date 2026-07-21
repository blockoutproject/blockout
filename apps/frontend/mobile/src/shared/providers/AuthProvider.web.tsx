import React from "react";
import {
  Auth0Provider as Auth0ReactProvider,
  useAuth0 as useAuth0React,
  type User,
} from "@auth0/auth0-react";

import { AUTH0_CONFIG } from "@/src/shared/config/config";

export type { User };

type Auth0ProviderProps = React.PropsWithChildren<{
  domain: string;
  clientId: string;
}>;

/** Provides the official Auth0 SPA client when Expo runs in a browser. */
export const Auth0Provider: React.FC<Auth0ProviderProps> = ({
  children,
  domain,
  clientId,
}) => (
  <Auth0ReactProvider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      audience: AUTH0_CONFIG.audience,
      redirect_uri: window.location.origin,
      scope: "openid profile email offline_access",
    }}
    cacheLocation="memory"
    useRefreshTokens
    useRefreshTokensFallback
  >
    {children}
  </Auth0ReactProvider>
);

/** Adapts the Auth0 SPA SDK to the small interface used by the shared session provider. */
export const useAuth0 = () => {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0React();

  return {
    authorize: async (options?: { audience?: string; scope?: string }) => {
      await loginWithRedirect({ authorizationParams: options });
    },
    clearSession: async (options?: { federated?: boolean }) => {
      await logout({
        logoutParams: {
          federated: options?.federated,
          returnTo: window.location.origin,
        },
      });
    },
    clearCredentials: async () => {
      await logout({ openUrl: false });
    },
    getCredentials: async () => {
      if (!isAuthenticated) return null;
      const accessToken = await getAccessTokenSilently();
      return { accessToken };
    },
    user: user ?? null,
    error: error ?? null,
    isLoading,
  };
};
