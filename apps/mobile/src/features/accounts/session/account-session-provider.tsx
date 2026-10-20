import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
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

/** Authentication availability only: Query owns profile availability and RevenueCat owns entitlements. */
type AuthenticationStatus =
  | "initializing"
  | "initialization-error"
  | "restoring"
  | "authentication-error"
  | "guest"
  | "authenticated";

/** Sole transient account boundary; it retains neither credentials nor a copy of remote business data. */
export interface AccountSession extends SessionSnapshot, SessionGeneration {
  status: AuthenticationStatus;
  error: unknown;
  /** Retries failed installation initialization without blocking public navigation. */
  retryInitialization(): void;
  /** Uses ordinary SDK restoration/renewal; obsolete work rejects with AbortError. */
  getCredentials(generation: string): Promise<Credentials | undefined>;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | { status: "ready"; domain: string; clientId: string };

const AccountSessionContext = createContext<AccountSession | null>(null);

/** Initializes F14 before mounting Auth0; public children remain available on waiting or failure. */
export function AccountSessionProvider({ children }: PropsWithChildren) {
  const [initialization, setInitialization] = useState<Initialization>({
    status: "initializing",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /** Resolves the configured native client and leaves credential clearing/markers to F14. */
    async function initialize() {
      try {
        const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
        const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
        if (!domain || !clientId)
          throw new Error("Native authentication is not configured");
        await initializeV2Installation(new Auth0({ domain, clientId }));
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
  }, [attempt]);

  /** Allows a failed initialization to be retried explicitly, without restarting a usable session. */
  function retryInitialization() {
    if (initialization.status !== "initialization-error") return;
    setInitialization({ status: "initializing" });
    setAttempt((value) => value + 1);
  }

  if (initialization.status === "ready") {
    return (
      <Auth0Provider
        domain={initialization.domain}
        clientId={initialization.clientId}
      >
        <NativeAccountSession retryInitialization={retryInitialization}>
          {children}
        </NativeAccountSession>
      </Auth0Provider>
    );
  }
  return (
    <SessionScope
      status={initialization.status}
      error={
        initialization.status === "initialization-error"
          ? initialization.error
          : null
      }
      retryInitialization={retryInitialization}
    >
      {children}
    </SessionScope>
  );
}

/** Reads SDK-owned authentication; changing the principal discards the previous React session scope. */
function NativeAccountSession({
  children,
  retryInitialization,
}: PropsWithChildren<{ retryInitialization: () => void }>) {
  const auth = useAuth0();
  const status = auth.isLoading
    ? "restoring"
    : auth.user
      ? "authenticated"
      : auth.error
        ? "authentication-error"
        : "guest";
  return (
    <SessionScope
      key={auth.user?.sub ?? "guest"}
      status={status}
      error={auth.error}
      retryInitialization={retryInitialization}
      readCredentials={auth.getCredentials}
    >
      {children}
    </SessionScope>
  );
}

/** Owns one principal's transient context and invalidates captured callbacks when that scope ends. */
function SessionScope({
  children,
  status,
  error,
  retryInitialization,
  readCredentials,
}: PropsWithChildren<{
  status: AuthenticationStatus;
  error: unknown;
  retryInitialization: () => void;
  readCredentials?: () => Promise<Credentials | undefined>;
}>) {
  const [session] = useState(createSessionGeneration);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useLayoutEffect(() => () => session.invalidate(), [session]);

  const value: AccountSession = {
    ...session,
    ...snapshot,
    status,
    error,
    retryInitialization,
    setAccount: (generation, accountId) =>
      status === "authenticated" && session.setAccount(generation, accountId),
    async getCredentials(generation) {
      assertCurrent(session, generation);
      if (status !== "authenticated" || !readCredentials) return undefined;
      let credentials: Credentials | undefined;
      try {
        credentials = await readCredentials();
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

/** Reads the account boundary; consumers must be mounted beneath the application's session owner. */
export function useAccountSession(): AccountSession {
  const session = useContext(AccountSessionContext);
  if (!session)
    throw new Error("useAccountSession requires AccountSessionProvider");
  return session;
}
