import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { completeDiscovery, readDiscoveryCompletion } from "./discovery-state";

/** Local installation lifecycle only; account, entitlement and advertising owners are independent. */
interface Discovery {
  complete: boolean;
  loading: boolean;
  saving: boolean;
  error: "read" | "write" | undefined;
  retryRead(): void;
  finish(): void;
}

const DiscoveryContext = createContext<Discovery | null>(null);

/** Mutually exclusive persistence phases; completion is acknowledged storage, never optimistic UI. */
type DiscoveryPhase =
  | "loading"
  | "read-error"
  | "incomplete"
  | "saving"
  | "write-error"
  | "complete";

/** Reads once per mounted installation tree and admits ordinary routes only after persisted completion. */
export function DiscoveryProvider({ children }: PropsWithChildren) {
  const [phase, setPhase] = useState<DiscoveryPhase>("loading");

  useEffect(() => {
    if (phase !== "loading" && phase !== "saving") return;
    let mounted = true;
    const operation =
      phase === "loading"
        ? readDiscoveryCompletion()
        : completeDiscovery().then(() => true);
    void operation.then(
      (value) => {
        if (mounted) setPhase(value ? "complete" : "incomplete");
      },
      () => {
        if (mounted)
          setPhase(phase === "loading" ? "read-error" : "write-error");
      },
    );
    return () => {
      mounted = false;
    };
  }, [phase]);

  /** Retries only the rejected read after an explicit user action. */
  function retryRead() {
    if (phase === "read-error") setPhase("loading");
  }

  /** Leaves discovery incomplete on persistence rejection; the same explicit action may retry. */
  function finish() {
    if (phase === "incomplete" || phase === "write-error") setPhase("saving");
  }

  return (
    <DiscoveryContext
      value={{
        complete: phase === "complete",
        loading: phase === "loading",
        saving: phase === "saving",
        error:
          phase === "read-error"
            ? "read"
            : phase === "write-error"
              ? "write"
              : undefined,
        retryRead,
        finish,
      }}
    >
      {children}
    </DiscoveryContext>
  );
}

/** Exposes the one local completion owner to discovery and root route composition. */
export function useDiscovery(): Discovery {
  const value = useContext(DiscoveryContext);
  if (!value) throw new Error("Discovery requires DiscoveryProvider");
  return value;
}
