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
  finish(): Promise<void>;
}

const DiscoveryContext = createContext<Discovery | null>(null);

/** Reads once per mounted installation tree and admits ordinary routes only after persisted completion. */
export function DiscoveryProvider({ children }: PropsWithChildren) {
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Discovery["error"]>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    readDiscoveryCompletion().then(
      (value) => {
        if (mounted) {
          setComplete(value);
          setLoading(false);
        }
      },
      () => {
        if (mounted) {
          setError("read");
          setLoading(false);
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [attempt]);

  /** Retries only the rejected read after an explicit user action. */
  function retryRead() {
    setError(undefined);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  /** Leaves discovery incomplete on persistence rejection; the same explicit action may retry. */
  async function finish() {
    if (loading || saving || error === "read") return;
    setSaving(true);
    setError(undefined);
    try {
      await completeDiscovery();
      setComplete(true);
    } catch {
      setError("write");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DiscoveryContext
      value={{ complete, loading, saving, error, retryRead, finish }}
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
