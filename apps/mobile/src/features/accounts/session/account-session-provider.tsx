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
import Auth0, {
  Auth0Provider,
  useAuth0,
  type Credentials,
} from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  createSessionGeneration,
  type SessionGeneration,
  type SessionSnapshot,
} from "./session-generation";

/** Authentication availability only: Query owns profiles and RevenueCat owns entitlements. */
type AuthenticationStatus =
  | "initialization-error"
  | "restoring"
  | "authentication-error"
  | "guest"
  | "authenticated";

/**
 * Transient business boundary; credentials and identity stay SDK-owned.
 * Lifecycle commands must invalidate synchronously before awaiting native login/logout or cleanup.
 */
export interface AccountSession extends SessionSnapshot, SessionGeneration {
  /** Invalidates private work before native local clearing; the sign-out flow owns browser/network cleanup. */
  clearCredentials(): Promise<void>;
  status: AuthenticationStatus;
  error: unknown;
  /** Retries failed F14 initialization; success replaces the exceptional guest navigation. */
  retryInitialization(): void;
  /** Remounts the SDK after failed restoration, resetting navigation without clearing credentials. */
  retryAuthentication(): void;
  /** Uses native retrieval/renewal without mutating SDK React state; obsolete work rejects with AbortError. */
  getCredentials(generation: string): Promise<Credentials | undefined>;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | { status: "ready"; domain: string; clientId: string; client: Auth0 };

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
          setInitialization({ status: "ready", domain, clientId, client });
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
  const [session] = useState(createSessionGeneration);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const subject = auth.user?.sub ?? null;
  const previousSubject = useRef<string | null>(null);

  useLayoutEffect(() => () => session.invalidate(), [session]);
  useLayoutEffect(() => {
    if (previousSubject.current !== subject) {
      session.invalidate();
      previousSubject.current = subject;
    }
  }, [session, subject]);

  const status: AuthenticationStatus =
    initialization.status === "initialization-error"
      ? "initialization-error"
      : auth.isLoading
        ? "restoring"
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
    async clearCredentials() {
      session.invalidate();
      if (initialization.status === "ready") await auth.clearCredentials();
    },
    setAccount: (generation, accountId) =>
      status === "authenticated" && session.setAccount(generation, accountId),
    async getCredentials(generation) {
      assertCurrent(session, generation);
      if (status !== "authenticated" || initialization.status !== "ready")
        return undefined;
      let credentials: Credentials;
      try {
        // The hook variant updates SDK state before a generation guard could reject obsolete work.
        credentials =
          await initialization.client.credentialsManager.getCredentials();
      } catch (error) {
        assertCurrent(session, generation);
        throw error;
      }
      assertCurrent(session, generation);
      return credentials;
    },
  };

  return (
    <AccountSessionContext value={value}>{children}</AccountSessionContext>
  );
}

/** Discards both successful and failed credential completions from a previous session. */
function assertCurrent(session: SessionGeneration, generation: string): void {
  if (!session.isCurrent(generation))
    throw new DOMException("Session changed", "AbortError");
}

/** Reads the business boundary; SDK actions are also available below the initialized Auth0Provider. */
export function useAccountSession(): AccountSession {
  const session = useContext(AccountSessionContext);
  if (!session)
    throw new Error("useAccountSession requires AccountSessionProvider");
  return session;
}
