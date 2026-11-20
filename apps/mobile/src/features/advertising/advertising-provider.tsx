import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { useAccountSession } from "@/features/accounts/current-account";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { usePro } from "@/features/pro";
import type { createInstallationAdvertisingPrivacy } from "./advertising-privacy";

type AdvertisingOwner = ReturnType<typeof createInstallationAdvertisingPrivacy>;

const Advertising = createContext<Pick<
  AdvertisingOwner,
  "subscribe" | "getSnapshot" | "showPrivacyOptions" | "openSportingDestination"
> | null>(null);

export function AdvertisingProvider({
  children,
  enabled,
  privacy,
}: Readonly<
  PropsWithChildren<{
    enabled: boolean;
    privacy: AdvertisingOwner;
  }>
>) {
  const { subject, accountId } = useAccountSession();
  const pro = usePro();
  const admission = useAccessAdmission();
  const ordinary = enabled && admission.ordinary;
  useLayoutEffect(() => {
    privacy.setContext({
      ordinary,
      subject,
      accountId,
      isFree() {
        const { status } = pro.getState();
        return status === "guest" || status === "inactive";
      },
    });
  });
  useLayoutEffect(() => () => privacy.setContext(null), [privacy]);
  useEffect(() => {
    void privacy.synchronize();
  }, [privacy, ordinary, subject, accountId, pro.state.status]);
  return <Advertising value={privacy}>{children}</Advertising>;
}

export function useAdvertising() {
  const value = useContext(Advertising);
  if (!value) {
    throw new Error("useAdvertising requires AdvertisingProvider");
  }
  return value;
}

export function useAdvertisingChoices() {
  const { subscribe, getSnapshot, showPrivacyOptions } = useAdvertising();
  return {
    ...useSyncExternalStore(subscribe, getSnapshot),
    showPrivacyOptions,
  };
}
