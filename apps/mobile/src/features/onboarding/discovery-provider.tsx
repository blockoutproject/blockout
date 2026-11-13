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
  finish(): void;
}

const DiscoveryContext = createContext<Discovery | null>(null);

/** Process-root discovery completes for this application session; failed persistence may repeat it next launch. */
export function DiscoveryProvider({ children }: Readonly<PropsWithChildren>) {
  const [complete, setComplete] = useState<boolean>();

  useEffect(() => {
    let current = true;
    void readDiscoveryCompletion().then(
      (value) => {
        if (current) {
          setComplete(value);
        }
      },
      () => {
        if (current) {
          setComplete(false);
        }
      },
    );
    return () => {
      current = false;
    };
  }, []);

  function finish() {
    setComplete(true);
    void completeDiscovery().catch(() => undefined);
  }

  return (
    <DiscoveryContext
      value={{
        complete: complete === true,
        loading: complete === undefined,
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
  if (!value) {
    throw new Error("Discovery requires DiscoveryProvider");
  }
  return value;
}
