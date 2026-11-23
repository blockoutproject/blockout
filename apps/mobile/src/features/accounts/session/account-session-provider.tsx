import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import Auth0, {
  Auth0Provider,
  parseIdToken,
  useAuth0,
  type Credentials,
} from "react-native-auth0";
import { ApiError } from "@/shared/api/api-fetch";
import { createQueryClient } from "@/shared/query/query-client";
import { currentAccountQuery } from "../api/current-account-query";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { requiresReauthentication } from "./native-session";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { establishAccountForSession } from "../api/establish-account";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";

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
  /** The explicit connection command survives the SDK's subject change; Query owns its outcome. */
  connection: UseMutationResult<void, Error, AccountConnectionInput>;
  /** Captures the original principal before asynchronous credential preparation. */
  getCredentials(): Promise<Credentials>;
  /** Starts hosted login only from an explicit action and returns its native principal. */
  signIn(audience: string): Promise<AccountCommandSession | undefined>;
  /** Attempts exact push removal, then uses the native SDK's ordinary logout semantics. */
  signOut(): Promise<void>;
  /** Clears this caller's native subject, retiring the specified push association locally after erasure. */
  clearCredentials(options?: { erasedAccountId: string }): Promise<void>;
  /** Retries installation/SDK initialization only in initialization-error; otherwise does nothing. */
  retryInitialization(): void;
  /** Retries SDK credential restoration only in authentication-error; otherwise does nothing. */
  retryAuthentication(): void;
}

/** Keeps the initiating private owner's native login and credential-error cleanup together. */
export interface AccountConnectionInput {
  audience: string;
  signIn: AccountSession["signIn"];
}

/** F07 captures the exact original association and owns the bounded attempt before native logout. */
export type AccountCredentialCleanup = () => Promise<void>;

/** Root composition supplies the process-wide push owner without transferring its authority. */
export interface AccountSessionProviderProps extends PropsWithChildren {
  fallback?: ReactNode;
  preparePushRemoval?: () => AccountCredentialCleanup | undefined;
  abandonPushRegistration?: (erasedAccountId: string) => void;
}

/** F14 setup result; the credentials manager exists only after native initialization succeeds. */
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
  abandonPushRegistration,
}: Readonly<AccountSessionProviderProps>) {
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
        if (!domain || !clientId) {
          throw new Error("Native authentication is not configured");
        }
        const client = new Auth0({ domain, clientId, useDPoP: false });
        await initializeV2Installation(client);
        if (active) {
          setInitialization({
            status: "ready",
            domain,
            clientId,
            credentialsManager: client.credentialsManager,
          });
        }
      } catch (error) {
        if (active) {
          setInitialization({ status: "initialization-error", error });
        }
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [initializationAttempt]);
  if (initialization.status === "initializing") {
    return fallback;
  }
  const content = (
    <SessionScope
      initialization={initialization}
      retryInitialization={() => setInitializationAttempt((value) => value + 1)}
      retryAuthentication={() => setRestorationAttempt((value) => value + 1)}
      preparePushRemoval={preparePushRemoval}
      abandonPushRegistration={abandonPushRegistration}
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
  abandonPushRegistration,
}: Readonly<
  PropsWithChildren<{
    initialization: Exclude<Initialization, { status: "initializing" }>;
    retryInitialization(): void;
    retryAuthentication(): void;
    preparePushRemoval?: AccountSessionProviderProps["preparePushRemoval"];
    abandonPushRegistration?: AccountSessionProviderProps["abandonPushRegistration"];
  }>
>) {
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
  const nativeOperationPending = useRef(false);
  const { request } = useOrdinaryRequest();
  /** Prepares credentials for the captured principal without allowing another subject to dispatch. */
  const credentialsFor = useCallback(
    async (original: string | null) => {
      if (!original) {
        throw new ApiError("http", 401);
      }
      if (!manager) {
        throw new ApiError("configuration");
      }
      if (currentSubject.current !== original) {
        throw new ApiError("cancelled");
      }
      const credentials = await manager.getCredentials();
      if (
        currentSubject.current !== original ||
        !credentials ||
        parseIdToken(credentials.idToken).sub !== original
      ) {
        throw new ApiError("cancelled");
      }
      return credentials;
    },
    [manager],
  );
  const getCredentials = useCallback(
    () => credentialsFor(subject),
    [credentialsFor, subject],
  );

  const connection = useMutation({
    mutationKey: ["account-connection"],
    gcTime: 0,
    mutationFn: async ({ audience, signIn }: AccountConnectionInput) => {
      const principal = await signIn(audience);
      if (!principal) {
        throw new ApiError("cancelled");
      }
      try {
        await establishAccountForSession(principal, request);
      } catch (error) {
        if (currentSubject.current !== principal.subject) {
          throw new ApiError("cancelled");
        }
        throw error;
      }
      if (currentSubject.current !== principal.subject) {
        throw new ApiError("cancelled");
      }
    },
  });
  const activeOperation = connection.isPending ? "authenticating" : operation;
  let status: AuthenticationStatus = "guest";
  if (initialization.status === "initialization-error") {
    status = "initialization-error";
  } else if (activeOperation) {
    status = activeOperation;
  } else if (auth.isLoading) {
    status = "restoring";
  } else if (requiresReauthentication(auth.error)) {
    status = "reauthentication-required";
  } else if (subject) {
    status = "authenticated";
  } else if (auth.error) {
    status = "authentication-error";
  }

  /** A command captured before a network wait cannot run over an active native identity change. */
  async function runNativeOperation<T>(
    next: NonNullable<AccountSession["operation"]>,
    run: () => Promise<T>,
  ): Promise<T | undefined> {
    if (currentSubject.current !== subject) {
      throw new ApiError("cancelled");
    }
    if (activeOperation || nativeOperationPending.current) {
      return;
    }
    nativeOperationPending.current = true;
    setOperation(next);
    try {
      return await run();
    } finally {
      nativeOperationPending.current = false;
      setOperation(undefined);
    }
  }

  /** Retains the departure's original subject throughout the bounded push attempt. */
  async function removeOldPushRegistration() {
    const remove = preparePushRemoval?.();
    await remove?.().catch(() => undefined);
    if (currentSubject.current !== subject) {
      throw new ApiError("cancelled");
    }
  }

  async function depart(clear: () => Promise<void>, erasedAccountId?: string) {
    const completed = await runNativeOperation("signing-out", async () => {
      connection.reset();
      if (erasedAccountId) {
        abandonPushRegistration?.(erasedAccountId);
      } else {
        await removeOldPushRegistration();
      }
      if (initialization.status === "ready") {
        await clear();
        return true;
      }
    });
    if (erasedAccountId && !completed) {
      throw new ApiError("cancelled");
    }
  }

  const session: Omit<AccountSession, "accountId"> = {
    subject,
    status,
    operation: activeOperation,
    connection,
    error:
      initialization.status === "initialization-error"
        ? initialization.error
        : auth.error,
    getCredentials,
    retryInitialization() {
      if (status === "initialization-error") {
        retryInitialization();
      }
    },
    retryAuthentication() {
      if (status === "authentication-error") {
        retryAuthentication();
      }
    },
    async signIn(audience) {
      if (activeOperation) {
        return;
      }
      if (initialization.status !== "ready") {
        throw new Error("Native authentication is unavailable");
      }
      return runNativeOperation("authenticating", async () => {
        await removeOldPushRegistration();
        const credentials = await auth.authorize({
          audience,
          scope: "openid profile email offline_access",
        });
        const principal = parseIdToken(credentials.idToken).sub;
        // Auth0 has completed login before React necessarily commits its user update.
        currentSubject.current = principal;
        return {
          subject: principal,
          getCredentials: () => credentialsFor(principal),
        };
      });
    },
    signOut() {
      return depart(() => auth.clearSession());
    },
    clearCredentials(options) {
      return depart(auth.clearCredentials, options?.erasedAccountId);
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
}: Readonly<
  PropsWithChildren<{ session: Omit<AccountSession, "accountId"> }>
>) {
  const [client] = useState(createQueryClient);
  const [credentialError, setCredentialError] = useState<unknown>();
  const nativeCredentials = session.getCredentials;
  /** Keeps native renewal failures separate from HTTP account-read outcomes. */
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
  const current: Omit<AccountSession, "accountId"> = {
    ...session,
    getCredentials,
    /** Clears the previous credential failure only after an explicit native login succeeds. */
    async signIn(audience: string) {
      const login = await session.signIn(audience);
      if (login) {
        setCredentialError(undefined);
      }
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

/** Observes the business UUID and rereads it on native foreground return within this private lifetime. */
function CurrentAccountIdentity({
  children,
  session,
}: Readonly<
  PropsWithChildren<{ session: Omit<AccountSession, "accountId"> }>
>) {
  const client = useQueryClient();
  const account = useQuery(currentAccountQuery(session));
  const connected = session.connection.isSuccess;
  useEffect(() => {
    if (connected) {
      void client.invalidateQueries(
        { queryKey: getGetMyAccountQueryKey(), exact: true },
        { cancelRefetch: false },
      );
    }
  }, [client, connected]);
  /** Reads current enablement at the native event without renewing the subscription on Query changes. */
  const refreshAccount = useEffectEvent(() => {
    if (account.isEnabled) {
      void account.refetch({ cancelRefetch: false });
    }
  });
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshAccount();
      }
    });
    return () => subscription.remove();
  }, []);
  const value = {
    ...session,
    accountId: account.data?.accountId ?? null,
  };
  return (
    <AccountSessionContext value={value}>{children}</AccountSessionContext>
  );
}

/** Reads the SDK-derived session and current private account; callers obtain credentials through this owner. */
export function useAccountSession(): AccountSession {
  const session = useContext(AccountSessionContext);
  if (!session) {
    throw new Error("useAccountSession requires AccountSessionProvider");
  }
  return session;
}
