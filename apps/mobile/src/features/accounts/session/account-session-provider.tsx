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
  /** Uses native SDK retrieval/renewal without updating the SDK user; obsolete work rejects with AbortError. */
  getCredentials(generation: string): Promise<Credentials | undefined>;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | { status: "ready"; domain: string; clientId: string; client: Auth0 };

/** Minimal availability projection of the SDK; identity and credentials remain SDK-owned. */
interface AuthenticationAvailability {
  status: AuthenticationStatus;
  error: unknown;
}

const AccountSessionContext = createContext<AccountSession | null>(null);

/** Initializes F14 before mounting the SDK bridge, preserving the public subtree throughout session changes. */
export function AccountSessionProvider({ children }: PropsWithChildren) {
  const [session] = useState(createSessionGeneration);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [initialization, setInitialization] = useState<Initialization>({
    status: "initializing",
  });
  const [authentication, setAuthentication] =
    useState<AuthenticationAvailability>({
      status: "restoring",
      error: null,
    });
  const [attempt, setAttempt] = useState(0);
  useLayoutEffect(() => () => session.invalidate(), [session]);

  useEffect(() => {
    let cancelled = false;

    /** Resolves the configured native client and leaves credential clearing/markers to F14. */
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
  }, [attempt]);

  /** Allows a failed initialization to be retried explicitly, without restarting a usable session. */
  function retryInitialization() {
    if (initialization.status !== "initialization-error") return;
    setInitialization({ status: "initializing" });
    setAttempt((value) => value + 1);
  }

  const status =
    initialization.status === "ready"
      ? authentication.status
      : initialization.status;
  const error =
    initialization.status === "ready"
      ? authentication.error
      : initialization.status === "initialization-error"
        ? initialization.error
        : null;
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
      if (status !== "authenticated" || initialization.status !== "ready")
        return undefined;
      let credentials: Credentials;
      try {
        // The hook variant updates Auth0's user before our generation guard can reject an obsolete result.
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
    <AccountSessionContext value={value}>
      {children}
      {initialization.status === "ready" && (
        <Auth0Provider
          domain={initialization.domain}
          clientId={initialization.clientId}
        >
          <NativeAuthentication
            session={session}
            onChange={setAuthentication}
          />
        </Auth0Provider>
      )}
    </AccountSessionContext>
  );
}

/** Observes SDK authentication without placing public navigation inside its conditional lifecycle. */
function NativeAuthentication({
  session,
  onChange,
}: {
  session: SessionGeneration;
  onChange: (availability: AuthenticationAvailability) => void;
}) {
  const auth = useAuth0();
  const subject = auth.user?.sub ?? null;
  const previousSubject = useRef<string | null>(null);
  const status = auth.isLoading
    ? "restoring"
    : auth.user
      ? "authenticated"
      : auth.error
        ? "authentication-error"
        : "guest";

  useLayoutEffect(() => {
    if (previousSubject.current !== subject) {
      session.invalidate();
      previousSubject.current = subject;
    }
    onChange({ status, error: auth.error });
  }, [session, subject, status, auth.error, onChange]);

  return null;
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
