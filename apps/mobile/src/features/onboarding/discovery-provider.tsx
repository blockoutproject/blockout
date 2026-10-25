import { useActionFeedback } from "../../shared/components/action-feedback";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { completeDiscovery, readDiscoveryCompletion } from "./discovery-state";

/** Local installation lifecycle only; account, entitlement and advertising owners are independent. */
interface Discovery {
  complete: boolean;
  loading: boolean;
  saving: boolean;
  error: "read" | undefined;
  retryRead(): void;
  finish(): void;
}

const DiscoveryContext = createContext<Discovery | null>(null);

/** Mutually exclusive persistence phases; completion is acknowledged storage, never optimistic UI. */
type DiscoveryPhase =
  "loading" | "read-error" | "incomplete" | "saving" | "complete";

/** Reads once per mounted installation tree and admits ordinary routes only after persisted completion. */
export function DiscoveryProvider({ children }: PropsWithChildren) {
  const feedback = useActionFeedback();
  const [phase, setPhase] = useState<DiscoveryPhase>("loading");
  const mounted = useRef(false);
  const completion = useRef<Promise<void> | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    let current = true;
    void readDiscoveryCompletion().then(
      (value) => {
        if (current) setPhase(value ? "complete" : "incomplete");
      },
      () => {
        if (current) setPhase("read-error");
      },
    );
    return () => {
      current = false;
    };
  }, [phase]);

  /** Retries only the rejected read after an explicit user action. */
  function retryRead() {
    if (phase === "read-error") setPhase("loading");
  }

  /** Starts the explicit write before rendering; one operation survives route disposal without replay. */
  function finish() {
    if (!mounted.current || completion.current || phase !== "incomplete")
      return;
    feedback.clear();
    setPhase("saving");
    completion.current = completeDiscovery().then(
      () => {
        if (mounted.current) setPhase("complete");
      },
      () => {
        completion.current = undefined;
        if (mounted.current) {
          setPhase("incomplete");
          feedback.error(
            "La fin de la découverte n’a pas pu être enregistrée. Réessayez avec Passer ou Commencer.",
          );
        }
      },
    );
  }

  return (
    <DiscoveryContext
      value={{
        complete: phase === "complete",
        loading: phase === "loading",
        saving: phase === "saving",
        error: phase === "read-error" ? "read" : undefined,
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
