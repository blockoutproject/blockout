import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import Auth0, {
  Auth0Provider,
  parseIdToken,
  useAuth0,
  type Credentials,
} from "react-native-auth0";
import { ApiError } from "../../../shared/api/api-fetch";
import { createQueryClient } from "../../../shared/query/query-client";
import { currentAccountQuery } from "../api/current-account-query";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { requiresReauthentication } from "./native-session";

/** Native identity and the currently observed business account; neither carries a client epoch. */
export interface SessionSnapshot {
  readonly subject: string | null;
  readonly accountId: string | null;
}

/** Authentication availability comes from Auth0; Query owns the business profile. */
type AuthenticationStatus =
  | "initialization-error"
  | "restoring"
  | "authenticating"
  | "signing-out"
  | "authentication-error"
  | "reauthentication-required"
  | "guest"
  | "authenticated";

/** Captured native principal for an explicitly authorized account command. */
export interface AccountCommandSession {
  readonly subject: string;
  /** Uses the native credentials manager and rejects credentials belonging to another subject. */
  getCredentials(): Promise<Credentials>;
}

/** Auth0 presentation and ordinary lifecycle actions, without a second observable identity store. */
export interface AccountSession extends SessionSnapshot {
  status: AuthenticationStatus;
  operation?: "authenticating" | "signing-out";
  error: unknown;
  /** Captures the original principal before asynchronous credential preparation. */
  getCredentials(): Promise<Credentials>;
  /** Starts hosted login only from an explicit action and returns its native principal. */
  signIn(audience: string): Promise<AccountCommandSession | undefined>;
  /** Attempts exact push removal, then uses the native SDK's ordinary logout semantics. */
  signOut(): Promise<void>;
  /** Clears this caller's native subject locally after bounded push removal; refuses a different current subject. */
  clearCredentials(): Promise<void>;
  retryInitialization(): void;
  retryAuthentication(): void;
}

/** F07 captures the exact original association and owns the bounded attempt before native logout. */
export type AccountCredentialCleanup = () => Promise<void>;

/** Root composition supplies the process-wide push owner without transferring its authority. */
export interface AccountSessionProviderProps extends PropsWithChildren {
  fallback?: ReactNode;
  preparePushRemoval?: () => AccountCredentialCleanup | undefined;
}

type Initialization =
  | { status: "initializing" }
  | { status: "initialization-error"; error: unknown }
  | {
      status: "ready";
      domain: string;
      clientId: string;
      credentialsManager: Auth0["credentialsManager"];
    };

const AccountSessionContext = createContext<AccountSession | null>(null);

/** Completes F14 installation initialization before mounting the SDK; the public parent stays alive. */
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
    let active = true;
    /** F14 exclusively owns first-install credential clearing and its installation marker. */
    async function initialize() {
      try {
        const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
        const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
        if (!domain || !clientId)
          throw new Error("Native authentication is not configured");
        const client = new Auth0({ domain, clientId, useDPoP: false });
        await initializeV2Installation(client);
        if (active)
          setInitialization({
            status: "ready",
            domain,
            clientId,
            credentialsManager: client.credentialsManager,
          });
      } catch (error) {
        if (active)
          setInitialization({ status: "initialization-error", error });
      }
    }
    void initialize();
    return () => {
      active = false;
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

/** Uses SDK identity and its raw manager so an old credential read cannot publish another SET_USER. */
function SessionScope({
  children,
  initialization,
  retryInitialization,
  retryAuthentication,
  preparePushRemoval,
}: PropsWithChildren<{
  initialization: Exclude<Initialization, { status: "initializing" }>;
  retryInitialization(): void;
  retryAuthentication(): void;
  preparePushRemoval?: AccountSessionProviderProps["preparePushRemoval"];
}>) {
  const auth = useAuth0();
  const manager =
    initialization.status === "ready"
      ? initialization.credentialsManager
      : undefined;
  const subject = auth.user?.sub ?? null;
  const currentSubject = useRef(subject);
  useLayoutEffect(() => {
    currentSubject.current = subject;
  }, [subject]);
  const [operation, setOperation] = useState<AccountSession["operation"]>();
  const credentialsFor = useCallback(
    async (original: string | null) => {
      if (!original) throw new ApiError("http", 401);
      if (!manager) throw new ApiError("configuration");
      const credentials = await manager.getCredentials();
      if (!credentials || parseIdToken(credentials.idToken).sub !== original)
        throw new ApiError("cancelled");
      return credentials;
    },
    [manager],
  );
  const getCredentials = useCallback(
    () => credentialsFor(subject),
    [credentialsFor, subject],
  );
  let status: AuthenticationStatus = "guest";
  if (initialization.status === "initialization-error")
    status = "initialization-error";
  else if (operation) status = operation;
  else if (auth.isLoading) status = "restoring";
  else if (requiresReauthentication(auth.error))
    status = "reauthentication-required";
  else if (subject) status = "authenticated";
  else if (auth.error) status = "authentication-error";

  const session: Omit<AccountSession, "accountId"> = {
    subject,
    status,
    operation,
    error:
      initialization.status === "initialization-error"
        ? initialization.error
        : auth.error,
    getCredentials,
    retryInitialization() {
      if (status === "initialization-error") retryInitialization();
    },
    retryAuthentication() {
      if (status === "authentication-error") retryAuthentication();
    },
    async signIn(audience) {
      if (initialization.status !== "ready")
        throw new Error("Native authentication is unavailable");
      if (operation) return;
      const remove = preparePushRemoval?.();
      setOperation("authenticating");
      try {
        await remove?.().catch(() => undefined);
        const credentials = await auth.authorize({
          audience,
          scope: "openid profile email offline_access",
        });
        const principal = parseIdToken(credentials.idToken).sub;
        return {
          subject: principal,
          getCredentials: () => credentialsFor(principal),
        };
      } finally {
        setOperation(undefined);
      }
    },
    async signOut() {
      if (operation) return;
      const remove = preparePushRemoval?.();
      setOperation("signing-out");
      try {
        await remove?.().catch(() => undefined);
        if (initialization.status === "ready") await auth.clearSession();
      } finally {
        setOperation(undefined);
      }
    },
    async clearCredentials() {
      if (currentSubject.current !== subject) throw new ApiError("cancelled");
      if (operation) return;
      const remove = preparePushRemoval?.();
      setOperation("signing-out");
      try {
        await remove?.().catch(() => undefined);
        if (currentSubject.current !== subject) throw new ApiError("cancelled");
        if (initialization.status === "ready") await auth.clearCredentials();
      } finally {
        setOperation(undefined);
      }
    },
  };
  return (
    <PrivateAccountLifetime key={subject ?? "guest"} session={session}>
      {children}
    </PrivateAccountLifetime>
  );
}

/** Owns private reads, native credential-error presentation and cache within the subject's React lifetime. */
function PrivateAccountLifetime({
  children,
  session,
}: PropsWithChildren<{ session: Omit<AccountSession, "accountId"> }>) {
  const [client] = useState(createQueryClient);
  const [credentialError, setCredentialError] = useState<unknown>();
  const nativeCredentials = session.getCredentials;
  const getCredentials = useCallback(async () => {
    try {
      const credentials = await nativeCredentials();
      setCredentialError(undefined);
      return credentials;
    } catch (error) {
      setCredentialError(error);
      throw error;
    }
  }, [nativeCredentials]);
  const current = {
    ...session,
    getCredentials,
    async signIn(audience: string) {
      const login = await session.signIn(audience);
      if (login) setCredentialError(undefined);
      return login;
    },
    status:
      !session.operation && requiresReauthentication(credentialError)
        ? ("reauthentication-required" as const)
        : session.status,
    error: credentialError ?? session.error,
  };
  useEffect(
    () => () => {
      void client.cancelQueries().then(() => client.clear());
    },
    [client],
  );
  return (
    <QueryClientProvider client={client}>
      <CurrentAccountIdentity session={current}>
        {children}
      </CurrentAccountIdentity>
    </QueryClientProvider>
  );
}

/** Observes the business UUID in its native cache instead of publishing it into a session store. */
function CurrentAccountIdentity({
  children,
  session,
}: PropsWithChildren<{ session: Omit<AccountSession, "accountId"> }>) {
  const account = useQuery(currentAccountQuery(session));
  const unavailable =
    account.error instanceof ApiError &&
    [401, 403, 404].includes(account.error.status ?? 0);
  const value = {
    ...session,
    accountId: unavailable ? null : (account.data?.accountId ?? null),
  };
  return (
    <AccountSessionContext value={value}>{children}</AccountSessionContext>
  );
}

/** Reads the SDK-derived session and current private account; callers obtain credentials through this owner. */
export function useAccountSession(): AccountSession {
  const session = useContext(AccountSessionContext);
  if (!session)
    throw new Error("useAccountSession requires AccountSessionProvider");
  return session;
}
