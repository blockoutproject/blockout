import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";

import { setAuthOnApis } from "@/src/api";
import { ApiError } from "@/src/shared/api/ApiError";
import { AUTH0_CONFIG } from "@/src/shared/config/config";
import { useApis } from "@/src/shared/providers/ApiProvider";
import { useAuth0 } from "@/src/shared/providers/AuthProvider";
import {
  SessionActions,
  SessionContextProvider,
  SessionState,
} from "@/src/shared/providers/SessionContext";
import { useAppStatus } from "@/src/hooks/config/app/useAppStatus";
import { useRegisterPushToken } from "@/src/hooks/notification/useRegisterPushToken";
import { useEnsureUser } from "@/src/hooks/user/useEnsureUser";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import { computeIsUpdateRequired, getStoreUrl } from "@/src/utils/appVersion";
import { useGuestSessionStore } from "@/src/utils/guestSessionStore";
import { registerForPushNotificationsAsync } from "@/src/utils/notifications";
import { useOnboardingStore } from "@/src/utils/onboardingStore";

const APP_STATUS_BYPASS_SCOPES = ["update:maintenance"];

export {
  useSessionActions,
  useSessionState,
} from "@/src/shared/providers/SessionContext";
export type {
  SessionActions,
  SessionState,
} from "@/src/shared/providers/SessionContext";

export const SessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
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

  const queryClient = useQueryClient();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const apis = useApis();
  const registerPushToken = useRegisterPushToken();

  const isGuest = useGuestSessionStore((state) => state.isGuest);
  const setGuest = useGuestSessionStore((state) => state.continueAsGuest);
  const leaveGuestFlag = useGuestSessionStore((state) => state.leaveGuest);

  const {
    data: appStatus,
    isLoading: isAppStatusLoading,
    isError: isAppStatusError,
    refetch: refetchAppStatus,
  } = useAppStatus();

  const { allowed: canBypassAppStatus } = useHasScopes(
    APP_STATUS_BYPASS_SCOPES,
  );

  const [maintenanceBypass, setMaintenanceBypass] = useState(false);
  const [updateBypass, setUpdateBypass] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

  const isMaintenance = appStatus?.maintenance === true;
  const isUpdateRequired = useMemo(
    () => computeIsUpdateRequired(appStatus),
    [appStatus],
  );
  const appUpdateUrl = useMemo(() => getStoreUrl(appStatus), [appStatus]);
  const isLoading =
    isAuth0UserLoading || isCustomUserLoading || isAppStatusLoading;
  const isError = !!auth0UserError || !!customUserError || isAppStatusError;
  const isAuthenticated = !!auth0User && !!customUser;
  const error = customUserError || auth0UserError;

  const clearQueryCache = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const primeApisWithAuth = useCallback(async () => {
    const tokenSupplier = async () => {
      const credentials = await getCredentials(undefined, 60);
      return credentials?.accessToken ?? null;
    };

    const onUnauthorized = async (_error: ApiError) => {
      try {
        await clearCredentials();
        await clearQueryCache();
      } catch {}
    };

    setAuthOnApis(apis, tokenSupplier, onUnauthorized);
  }, [apis, clearCredentials, clearQueryCache, getCredentials]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshAppStatus = useCallback(async () => {
    await refetchAppStatus();
  }, [refetchAppStatus]);

  const signIn = useCallback(async () => {
    await authorize({
      audience: AUTH0_CONFIG.audience,
      scope: "openid profile email offline_access",
    });

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
    await clearQueryCache();
  }, [clearQueryCache, leaveGuestFlag]);

  const softResetAuth = useCallback(async () => {
    try {
      await clearCredentials();
      setAuthOnApis(apis, undefined, undefined);
      await clearQueryCache();
    } catch {}
  }, [apis, clearCredentials, clearQueryCache]);

  const signOutLocal = useCallback(async () => {
    if (useGuestSessionStore.getState().isGuest) return leaveGuest();
    await softResetAuth();
    setMaintenanceBypass(false);
    setUpdateBypass(false);
  }, [leaveGuest, softResetAuth]);

  const signOutSSO = useCallback(
    async (opts?: { federated?: boolean }) => {
      try {
        if (useGuestSessionStore.getState().isGuest) return leaveGuest();
        await clearSession(opts);
        await clearQueryCache();
        setMaintenanceBypass(false);
        setUpdateBypass(false);
      } catch {}
    },
    [clearQueryCache, clearSession, leaveGuest],
  );

  const bypassMaintenance = useCallback(() => setMaintenanceBypass(true), []);
  const resetBypassMaintenance = useCallback(
    () => setMaintenanceBypass(false),
    [],
  );
  const bypassUpdate = useCallback(() => setUpdateBypass(true), []);
  const resetBypassUpdate = useCallback(() => setUpdateBypass(false), []);

  useEffect(() => {
    if (!isMaintenance && maintenanceBypass) setMaintenanceBypass(false);
  }, [isMaintenance, maintenanceBypass]);

  useEffect(() => {
    if (!isUpdateRequired && updateBypass) setUpdateBypass(false);
  }, [isUpdateRequired, updateBypass]);

  useEffect(() => {
    if (!hasCompletedOnboarding || !isAuthenticated) return;

    const register = async () => {
      try {
        const token = await registerForPushNotificationsAsync().catch(
          () => null,
        );
        if (customUser?.id && token) {
          await registerPushToken(customUser.id, token).catch(() => {});
        }
      } catch {}
    };

    void register();
  }, [
    customUser?.id,
    hasCompletedOnboarding,
    isAuthenticated,
    registerPushToken,
  ]);

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

  const actions = useMemo<SessionActions>(
    () => ({
      signIn,
      continueAsGuest,
      leaveGuest,
      signOutLocal,
      signOutSSO,
      softResetAuth,
      bypassMaintenance,
      resetBypassMaintenance,
      bypassUpdate,
      resetBypassUpdate,
      refetch: refreshUser,
      refetchAppStatus: refreshAppStatus,
    }),
    [
      bypassMaintenance,
      bypassUpdate,
      continueAsGuest,
      leaveGuest,
      refreshAppStatus,
      refreshUser,
      resetBypassMaintenance,
      resetBypassUpdate,
      signIn,
      signOutLocal,
      signOutSSO,
      softResetAuth,
    ],
  );

  const state = useMemo<SessionState>(
    () => ({
      auth0User,
      customUser,
      isAuthenticated,
      isGuest,
      isLoading,
      isError,
      error,
      customUserError,
      auth0UserError,
      appStatus,
      isAppStatusLoading,
      isAppStatusError,
      isMaintenance,
      maintenanceBypass,
      canBypassMaintenance: canBypassAppStatus,
      isUpdateRequired,
      updateBypass,
      canBypassUpdate: canBypassAppStatus,
      appUpdateUrl,
      isBootstrapped,
    }),
    [
      appStatus,
      appUpdateUrl,
      auth0User,
      auth0UserError,
      canBypassAppStatus,
      customUser,
      customUserError,
      error,
      isAppStatusError,
      isAppStatusLoading,
      isAuthenticated,
      isBootstrapped,
      isError,
      isGuest,
      isLoading,
      isMaintenance,
      isUpdateRequired,
      maintenanceBypass,
      updateBypass,
    ],
  );

  return (
    <SessionContextProvider actions={actions} state={state}>
      {children}
    </SessionContextProvider>
  );
};
