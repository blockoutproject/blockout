import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import Auth0, { Auth0Provider, useAuth0 } from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  createSessionGeneration,
  type SessionGeneration,
  type SessionSnapshot,
} from "./session-generation";
import {
  requiresReauthentication,
  signOutNativeSession,
} from "./native-session";

/** Authentication availability only: Query owns profiles and RevenueCat owns entitlements. */
type AuthenticationStatus =
  | "initialization-error"
  | "restoring"
  | "authenticating"
  | "signing-out"
  | "authentication-error"
  | "reauthentication-required"
  | "guest"
  | "authenticated";

/**
 * Transient business boundary; credentials and identity stay SDK-owned.
 * Lifecycle commands must invalidate synchronously before awaiting native login/logout or cleanup.
 */
export interface AccountSession extends SessionSnapshot, SessionGeneration {
  /** Suspends business reads and invalidates private work before the SDK's explicit hosted login. */
  signIn(audience: string): Promise<AccountCommandSession | undefined>;
  /** Invalidates private work immediately, then attempts bounded push removal before independent native logout/clearing. */
  signOut(): Promise<void>;
  /** Invalidates private work and attempts bounded push removal before local SDK clearing, without browser closure. */
  clearCredentials(): Promise<void>;
  status: AuthenticationStatus;
  error: unknown;
  /** Retries failed F14 initialization; success replaces the exceptional guest navigation. */
  retryInitialization(): void;
  /** Remounts the SDK after failed restoration, resetting navigation without clearing credentials. */
  retryAuthentication(): void;
}

/** Original authenticated generation supplied directly by a successful explicit native login. */
export type AccountCommandSession = Pick<
  SessionSnapshot,
  "generation" | "accountId"
> &
  Pick<SessionGeneration, "isCurrent" | "setAccount">;

/** Captured F07 exact-removal operation; must settle within its bounded wait before SDK credentials are discarded. */
export type AccountCredentialCleanup = (
  session: Pick<SessionSnapshot, "generation"> &
    Pick<SessionGeneration, "isCurrent">,
) => Promise<void>;

/** Root composition supplies the existing push owner without transferring session or subscription authority. */
export interface AccountSessionProviderProps extends PropsWithChildren {
  fallback?: ReactNode;
  /** Captures the old exact association before invalidation; F07 owns one bounded attempt and retains no cleanup credential. */
  preparePushRemoval?: () => AccountCredentialCleanup | undefined;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | { status: "ready"; domain: string; clientId: string };

const AccountSessionContext = createContext<AccountSession | null>(null);

/**
 * Finishes local F14 initialization before mounting the standard SDK/application tree.
 * Failure leaves guest navigation available; ordinary identity changes never remount it.
 * An optional public fallback remains independent while first-install credentials are initialized.
 */
export function AccountSessionProvider({
  children,
  fallback = null,
  preparePushRemoval,
}: AccountSessionProviderProps) {
  const [initialization, setInitialization] = useState<Initialization>({
    status: "initializing",
  });
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [restorationAttempt, setRestorationAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /** Resolves the native client; F14 exclusively owns credential clearing and installation markers. */
    async function initialize() {
      try {
        const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
        const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
        if (!domain || !clientId)
          throw new Error("Native authentication is not configured");
        // The mobile API accepts Bearer tokens; DPoP requires a separate resource-server contract.
        const client = new Auth0({ domain, clientId, useDPoP: false });
        await initializeV2Installation(client);
        if (!cancelled)
          setInitialization({ status: "ready", domain, clientId });
      } catch (error) {
        if (!cancelled)
          setInitialization({ status: "initialization-error", error });
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [initializationAttempt]);

  if (initialization.status === "initializing") return fallback;

  const content = (
    <SessionScope
      initialization={initialization}
      retryInitialization={() => setInitializationAttempt((value) => value + 1)}
      retryAuthentication={() => setRestorationAttempt((value) => value + 1)}
      preparePushRemoval={preparePushRemoval}
    >
      {children}
    </SessionScope>
  );

  return initialization.status === "ready" ? (
    <Auth0Provider
      key={restorationAttempt}
      domain={initialization.domain}
      clientId={initialization.clientId}
      useDPoP={false}
    >
      {content}
    </Auth0Provider>
  ) : (
    content
  );
}

/** Derives availability directly from Auth0 and guards business work with one transient generation. */
function SessionScope({
  children,
  initialization,
  retryInitialization,
  retryAuthentication,
  preparePushRemoval,
}: PropsWithChildren<{
  initialization: Exclude<Initialization, { status: "initializing" }>;
  retryInitialization: () => void;
  retryAuthentication: () => void;
  preparePushRemoval?: AccountSessionProviderProps["preparePushRemoval"];
}>) {
  const auth = useAuth0();
  const [session] = useState(createSessionGeneration);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const reauthenticationRequired = requiresReauthentication(auth.error);

  useLayoutEffect(() => () => session.invalidate(), [session]);
  useLayoutEffect(() => {
    // Departure already invalidated private work; an old SDK error must not release its synchronous reservation.
    if (
      reauthenticationRequired &&
      session.getSnapshot().operation !== "signing-out"
    )
      session.invalidate();
  }, [session, reauthenticationRequired]);

  let status: AuthenticationStatus = "guest";
  if (initialization.status === "initialization-error")
    status = "initialization-error";
  else if (snapshot.operation) status = snapshot.operation;
  else if (auth.isLoading) status = "restoring";
  else if (reauthenticationRequired) status = "reauthentication-required";
  else if (auth.user) status = "authenticated";
  else if (auth.error) status = "authentication-error";

  /** Captures the old exact destination before synchronous invalidation; cleanup failure never prevents departure. */
  function beginDeparture(operation: "authenticating" | "signing-out") {
    const active = session.getSnapshot().operation;
    if (active === "signing-out" || active === operation) return;
    const remove = preparePushRemoval?.();
    const generation = session.beginOperation(operation);
    if (!generation) return;
    return {
      generation,
      removal: Promise.resolve()
        .then(() => remove?.({ generation, isCurrent: session.isCurrent }))
        .catch(() => undefined),
    };
  }
  const value: AccountSession = {
    ...session,
    ...snapshot,
    status,
    error:
      initialization.status === "initialization-error"
        ? initialization.error
        : auth.error,
    retryInitialization() {
      if (status === "initialization-error") retryInitialization();
    },
    retryAuthentication() {
      if (status !== "authentication-error") return;
      session.invalidate();
      retryAuthentication();
    },
    async signIn(audience) {
      if (initialization.status !== "ready")
        throw new Error("Native authentication is unavailable");
      const departure = beginDeparture("authenticating");
      if (!departure) return;
      const { generation } = departure;
      try {
        await departure.removal;
        if (!session.isCurrent(generation)) return;
        await auth.authorize({
          audience,
          scope: "openid profile email offline_access",
        });
        if (!session.isCurrent(generation)) return;
        return {
          generation,
          accountId: session.getSnapshot().accountId,
          isCurrent: session.isCurrent,
          setAccount: session.setAccount,
        };
      } finally {
        session.finishOperation(generation);
      }
    },
    async clearCredentials() {
      const departure = beginDeparture("signing-out");
      if (!departure) return;
      const { generation } = departure;
      try {
        await departure.removal;
        if (!session.isCurrent(generation)) return;
        if (initialization.status === "ready") await auth.clearCredentials();
      } finally {
        session.finishOperation(generation);
      }
    },
    async signOut() {
      const departure = beginDeparture("signing-out");
      if (!departure) return;
      const { generation } = departure;
      try {
        await departure.removal;
        if (!session.isCurrent(generation)) return;
        if (initialization.status === "ready") await signOutNativeSession(auth);
      } finally {
        session.finishOperation(generation);
      }
    },
    setAccount: (generation, accountId) =>
      status === "authenticated" && session.setAccount(generation, accountId),
  };

  return (
    <AccountSessionContext value={value}>{children}</AccountSessionContext>
  );
}

/** Reads the business boundary; SDK actions are also available below the initialized Auth0Provider. */
export function useAccountSession(): AccountSession {
  const session = useContext(AccountSessionContext);
  if (!session)
    throw new Error("useAccountSession requires AccountSessionProvider");
  return session;
}
