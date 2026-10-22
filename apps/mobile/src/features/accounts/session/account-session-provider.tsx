import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
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
  signIn(audience: string): Promise<void>;
  /** Invalidates private work immediately, then closes the native session with independent local clearing. */
  signOut(): Promise<void>;
  /** Invalidates private work before native local clearing; the sign-out flow owns browser/network cleanup. */
  clearCredentials(): Promise<void>;
  status: AuthenticationStatus;
  error: unknown;
  /** Retries failed F14 initialization; success replaces the exceptional guest navigation. */
  retryInitialization(): void;
  /** Remounts the SDK after failed restoration, resetting navigation without clearing credentials. */
  retryAuthentication(): void;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | { status: "ready"; domain: string; clientId: string };

const AccountSessionContext = createContext<AccountSession | null>(null);

/**
 * Finishes local F14 initialization before mounting the standard SDK/application tree.
 * Failure leaves guest navigation available; ordinary identity changes never remount it.
 */
export function AccountSessionProvider({ children }: PropsWithChildren) {
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
        const client = new Auth0({ domain, clientId });
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

  if (initialization.status === "initializing") return null;

  const content = (
    <SessionScope
      initialization={initialization}
      retryInitialization={() => setInitializationAttempt((value) => value + 1)}
      retryAuthentication={() => setRestorationAttempt((value) => value + 1)}
    >
      {children}
    </SessionScope>
  );

  return initialization.status === "ready" ? (
    <Auth0Provider
      key={restorationAttempt}
      domain={initialization.domain}
      clientId={initialization.clientId}
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
}: PropsWithChildren<{
  initialization: Exclude<Initialization, { status: "initializing" }>;
  retryInitialization: () => void;
  retryAuthentication: () => void;
}>) {
  const auth = useAuth0();
  const [operation, setOperation] = useState<
    "idle" | "authenticating" | "signing-out"
  >("idle");
  const [session] = useState(createSessionGeneration);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const subject = auth.user?.sub ?? null;
  const previousSubject = useRef<string | null>(null);
  const reauthenticationRequired = requiresReauthentication(auth.error);

  useLayoutEffect(() => () => session.invalidate(), [session]);
  useLayoutEffect(() => {
    if (previousSubject.current !== subject) {
      session.invalidate();
      previousSubject.current = subject;
    }
  }, [session, subject]);
  useLayoutEffect(() => {
    if (reauthenticationRequired) session.invalidate();
  }, [session, reauthenticationRequired]);

  const status: AuthenticationStatus =
    initialization.status === "initialization-error"
      ? "initialization-error"
      : operation !== "idle"
        ? operation
        : auth.isLoading
          ? "restoring"
          : reauthenticationRequired
            ? "reauthentication-required"
            : auth.user
              ? "authenticated"
              : auth.error
                ? "authentication-error"
                : "guest";
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
      setOperation("authenticating");
      session.invalidate();
      try {
        await auth.authorize({
          audience,
          scope: "openid profile email offline_access",
        });
      } finally {
        setOperation("idle");
      }
    },
    async clearCredentials() {
      setOperation("signing-out");
      session.invalidate();
      try {
        if (initialization.status === "ready") await auth.clearCredentials();
      } finally {
        setOperation("idle");
      }
    },
    async signOut() {
      setOperation("signing-out");
      session.invalidate();
      try {
        if (initialization.status === "ready") await signOutNativeSession(auth);
      } finally {
        setOperation("idle");
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
