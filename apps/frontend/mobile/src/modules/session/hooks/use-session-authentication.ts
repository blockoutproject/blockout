import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, usePathname } from "expo-router";

import { useAuth0 } from "@/src/modules/session/auth/auth-provider";
import { useGuestSessionStore } from "@/src/modules/session/model/guest-session-store";
import { setAuthOnApis } from "@/src/shared/api";
import type { ApiError } from "@/src/shared/api/api-error";
import { AUTH0_CONFIG } from "@/src/shared/config/config";
import { useApis } from "@/src/shared/providers/api-provider";
import { useResetQueryCache } from "@/src/shared/providers/query-provider";
import { useEnsureUser } from "@/src/modules/user/hooks/use-ensure-user";

type UseSessionAuthenticationOptions = {
  onAuthenticatedSessionEnded: () => void;
};

export const useSessionAuthentication = ({
  onAuthenticatedSessionEnded,
}: UseSessionAuthenticationOptions) => {
  const {
    authorize,
    clearSession,
    clearCredentials,
    getCredentials,
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
  const apis = useApis();
  const resetQueryCache = useResetQueryCache();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const isGuest = useGuestSessionStore((state) => state.isGuest);
  const setGuest = useGuestSessionStore((state) => state.continueAsGuest);
  const leaveGuestFlag = useGuestSessionStore((state) => state.leaveGuest);

  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

  const primeApisWithAuth = useCallback(async () => {
    const tokenSupplier = async () => {
      const credentials = await getCredentials(undefined, 60);
      return credentials?.accessToken ?? null;
    };

    const onUnauthorized = async (_error: ApiError) => {
      try {
        await clearCredentials();
        await resetQueryCache();
      } catch {}
    };

    setAuthOnApis(apis, tokenSupplier, onUnauthorized);
  }, [apis, clearCredentials, getCredentials, resetQueryCache]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signIn = useCallback(async () => {
    await authorize(
      {
        audience: AUTH0_CONFIG.audience,
        scope: "openid profile email offline_access",
      },
      {
        customScheme: AUTH0_CONFIG.customScheme,
      },
    );

    await primeApisWithAuth();
    await refreshUser();

    leaveGuestFlag();
    if (pathnameRef.current === "/profile") router.push("/(tabs)/(feed)");
  }, [authorize, leaveGuestFlag, primeApisWithAuth, refreshUser]);

  const continueAsGuest = useCallback(() => {
    setAuthOnApis(apis, undefined, undefined);
    setGuest();
  }, [apis, setGuest]);

  const leaveGuest = useCallback(async () => {
    leaveGuestFlag();
    await resetQueryCache();
  }, [leaveGuestFlag, resetQueryCache]);

  const softResetAuth = useCallback(async () => {
    try {
      await clearCredentials();
    } catch {}

    setAuthOnApis(apis, undefined, undefined);

    try {
      await resetQueryCache();
    } catch {}
  }, [apis, clearCredentials, resetQueryCache]);

  const signOutLocal = useCallback(async () => {
    if (useGuestSessionStore.getState().isGuest) return leaveGuest();
    await softResetAuth();
    onAuthenticatedSessionEnded();
  }, [leaveGuest, onAuthenticatedSessionEnded, softResetAuth]);

  const signOutSSO = useCallback(
    async (opts?: { federated?: boolean }) => {
      if (useGuestSessionStore.getState().isGuest) return leaveGuest();

      try {
        await clearSession(opts, {
          customScheme: AUTH0_CONFIG.customScheme,
        });
      } catch {}

      await softResetAuth();
      onAuthenticatedSessionEnded();
    },
    [clearSession, leaveGuest, onAuthenticatedSessionEnded, softResetAuth],
  );

  useEffect(() => {
    if (isAuth0UserLoading) return;

    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const credentials = await getCredentials(undefined, 60).catch(
          () => null,
        );

        if (credentials?.accessToken) {
          await primeApisWithAuth();
          await refreshUser();
        } else {
          setAuthOnApis(apis, undefined, undefined);
        }
      } catch {
        setAuthOnApis(apis, undefined, undefined);
      }
    };

    bootstrapPromiseRef.current ??= bootstrapAuth();
    const currentBootstrap = bootstrapPromiseRef.current;
    currentBootstrap.finally(() => {
      if (bootstrapPromiseRef.current === currentBootstrap) {
        bootstrapPromiseRef.current = null;
      }
      if (!cancelled) setIsBootstrapped(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    apis,
    auth0User?.sub,
    getCredentials,
    isAuth0UserLoading,
    primeApisWithAuth,
    refreshUser,
  ]);

  const state = useMemo(
    () => ({
      auth0User,
      customUser,
      isAuthenticated: !!auth0User && !!customUser,
      isGuest,
      isLoading: isAuth0UserLoading || isCustomUserLoading,
      isError: !!auth0UserError || !!customUserError,
      error: customUserError || auth0UserError,
      customUserError,
      auth0UserError,
      isBootstrapped,
    }),
    [
      auth0User,
      auth0UserError,
      customUser,
      customUserError,
      isAuth0UserLoading,
      isBootstrapped,
      isCustomUserLoading,
      isGuest,
    ],
  );
  const actions = useMemo(
    () => ({
      signIn,
      continueAsGuest,
      leaveGuest,
      signOutLocal,
      signOutSSO,
      softResetAuth,
      refetch: refreshUser,
    }),
    [
      continueAsGuest,
      leaveGuest,
      refreshUser,
      signIn,
      signOutLocal,
      signOutSSO,
      softResetAuth,
    ],
  );

  return {
    state,
    actions,
  };
};
