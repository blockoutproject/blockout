import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { usePro } from "../pro";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAccountSession } from "../accounts/current-account";
import { useAccessAdmission } from "../access/queries/use-access-admission";
import {
  createAdvertisingPrivacy,
  type AdvertisingPrivacySnapshot,
} from "./advertising-privacy";
import {
  getAgeDeclarationStatus,
  getAdvertisingAgeCategory,
  readAgeDeclaration,
  submitAgeDeclaration,
  type AgeDeclaration,
} from "./age-declaration";

/** Installation state survives account changes; F09 only suppresses unnecessary entry prompts. */
interface InstallationAge {
  declaration: AgeDeclaration | null;
  category: AgeDeclaration["category"];
  required: boolean;
  renewal: boolean;
  loading: boolean;
  readFailed: boolean;
  pending: boolean;
  /** Single SDK readiness and interstitial lifecycle, independent of installation persistence. */
  privacy: ReturnType<typeof createAdvertisingPrivacy>;
  nativePrivacy: AdvertisingPrivacySnapshot;
  /** Retries only the installation read after an explicit failure. */
  retryRead(): void;
  /** Starts one acknowledged write; an already active or disposed owner suppresses the action without success. */
  confirm(age: number): Promise<void> | undefined;
}

const AgeContext = createContext<InstallationAge | null>(null);

/** One acknowledged installation value and its read lifecycle; raw age remains in the submitting form. */
type DeclarationState =
  | { status: "loading" | "read-error"; evaluatedAt: Date }
  | { status: "ready"; evaluatedAt: Date; declaration: AgeDeclaration | null };

/** Reads when initial ordinary entry becomes possible, without a session key, account field or expiry timer. */
export function AgeDeclarationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const proOwner = usePro();
  const pro = proOwner.state;
  const account = useAccountSession();
  const admission = useAccessAdmission();
  const [state, setState] = useState<DeclarationState>(() => ({
    status: "loading",
    evaluatedAt: new Date(),
  }));
  const mounted = useRef(false);
  const submission = useRef<Promise<void> | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const category = getAdvertisingAgeCategory(
    state.status === "ready" ? state.declaration : null,
    state.evaluatedAt,
  );
  const [privacy] = useState(() =>
    createAdvertisingPrivacy({
      getContext: () => ({
        account,
        pro: proOwner.getState(),
        admission,
        category,
      }),
      adUnitId:
        Platform.OS === "ios"
          ? Constants.expoConfig?.extra?.advertising?.iosInterstitialUnitId
          : Constants.expoConfig?.extra?.advertising?.androidInterstitialUnitId,
    }),
  );
  useLayoutEffect(() => {
    privacy.setContext(() => ({
      account,
      pro: proOwner.getState(),
      admission,
      category,
    }));
  });
  const nativePrivacy = useSyncExternalStore(
    privacy.subscribe,
    privacy.getSnapshot,
  );
  const ready =
    enabled &&
    state.status === "ready" &&
    admission.ordinary &&
    (pro.status === "active" ||
      getAgeDeclarationStatus(state.declaration, state.evaluatedAt) ===
        "current");
  useLayoutEffect(() => {
    privacy.suspend();
  }, [
    privacy,
    account.generation,
    account.accountId,
    account.status,
    pro.status,
    category,
    ready,
  ]);
  useEffect(() => {
    if (ready && !pending) void privacy.synchronize()?.catch(() => undefined);
  }, [
    privacy,
    ready,
    account.generation,
    account.accountId,
    account.status,
    pro.status,
    category,
    nativePrivacy.pending,
    pending,
    state,
  ]);
  const { subscribe } = account;
  useLayoutEffect(() => subscribe(privacy.suspend), [subscribe, privacy]);
  useEffect(() => () => privacy.dispose(), [privacy]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || state.status !== "loading") return;
    let active = true;
    readAgeDeclaration().then(
      (value) => {
        if (active) {
          setState((current) => ({
            ...current,
            status: "ready",
            declaration: value,
          }));
        }
      },
      () => {
        if (active) {
          setState((current) => ({
            status: "read-error",
            evaluatedAt: current.evaluatedAt,
          }));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [state.status, enabled]);

  /** Explicit recovery preserves storage ownership; no automatic retries or guessed declaration. */
  function retryRead() {
    if (state.status === "read-error")
      setState({ status: "loading", evaluatedAt: state.evaluatedAt });
  }

  /** One installation operation owns admission and busy state across form mounts; F05 neither cancels nor replays it. */
  function confirm(age: number): Promise<void> | undefined {
    if (!mounted.current || submission.current) return;
    privacy.suspend();
    setPending(true);
    const now = new Date();
    const operation = submitAgeDeclaration(age, now)
      .then((saved) => {
        if (mounted.current)
          setState({ status: "ready", evaluatedAt: now, declaration: saved });
      })
      .finally(() => {
        if (submission.current === operation) {
          submission.current = undefined;
          if (mounted.current) setPending(false);
        }
      });
    submission.current = operation;
    return operation;
  }

  const declaration = state.status === "ready" ? state.declaration : null;
  const status = getAgeDeclarationStatus(declaration, state.evaluatedAt);
  return (
    <AgeContext
      value={{
        declaration,
        category,
        required: pro.status !== "active" && status !== "current",
        renewal: status === "expired",
        loading: state.status === "loading",
        readFailed: state.status === "read-error",
        pending,
        privacy,
        nativePrivacy,
        retryRead,
        confirm,
      }}
    >
      {children}
    </AgeContext>
  );
}

/** Reads the single local declaration owner; it authorizes no ad processing, account access or Pro right. */
export function useAgeDeclaration(): InstallationAge {
  const value = useContext(AgeContext);
  if (!value)
    throw new Error("Age declaration requires AgeDeclarationProvider");
  return value;
}
