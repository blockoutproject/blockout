import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { CONFIG } from "@/src/config/config";
import { useSession } from "@/src/context/SessionProvider";
import { usePurchasesCacheStore } from "../utils/purchasesStore";

type PurchasesContextValue = {
    isPro: boolean;
    isReady: boolean;
    isHydrated: boolean;
    customerInfo: CustomerInfo | null;
    refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function usePurchases() {
    const ctx = useContext(PurchasesContext);
    if (!ctx) throw new Error("usePurchases must be used within <PurchasesProvider>");
    return ctx;
}

function getApiKey() {
    if (Platform.OS === "ios") return CONFIG.REVENUECAT_IOS_API_KEY;
    if (Platform.OS === "android") return CONFIG.REVENUECAT_ANDROID_API_KEY;
    return "";
}

export const PurchasesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { isAuthenticated, auth0User, isBootstrapped } = useSession();

    const isProCached = usePurchasesCacheStore((s) => s.isProCached);
    const isHydrated = usePurchasesCacheStore((s) => s._hasHydrated);
    const setIsProCached = usePurchasesCacheStore((s) => s.setIsProCached);

    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const entitlementId = CONFIG.ENTITLEMENT_BLOCKOUT_PRO?.trim();

    const computedIsPro = useMemo(() => {
        if (!entitlementId) return false;
        return !!customerInfo?.entitlements?.active?.[entitlementId];
    }, [customerInfo, entitlementId]);

    const isPro = isReady ? computedIsPro : isProCached;

    const syncFromInfo = (info: CustomerInfo | null) => {
        setCustomerInfo(info);
        const next = entitlementId ? !!info?.entitlements?.active?.[entitlementId] : false;
        setIsProCached(next);
    };

    useEffect(() => {
        const apiKey = getApiKey();
        if (!apiKey) return;

        Purchases.configure({ apiKey });
        setIsConfigured(true);

        const listener = (info: CustomerInfo) => {
            syncFromInfo(info);
            setIsReady(true);
        };

        Purchases.addCustomerInfoUpdateListener(listener);

        Purchases.getCustomerInfo()
            .then((info) => {
                syncFromInfo(info);
                setIsReady(true);
            })
            .catch(() => setIsReady(true));

        return () => {
            Purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [entitlementId]);

    useEffect(() => {
        if (!isConfigured || !isBootstrapped) return;

        setIsReady(false);

        const auth0Id = auth0User?.sub?.trim() ?? "";

        if (isAuthenticated && auth0Id) {
            Purchases.logIn(auth0Id)
                .then(({ customerInfo: info }) => {
                    syncFromInfo(info);
                    setIsReady(true);
                })
                .catch(() => setIsReady(true));
            return;
        }

        Purchases.isAnonymous()
            .then((isAnonymous) =>
                isAnonymous ? Purchases.getCustomerInfo() : Purchases.logOut(),
            )
            .then((info) => {
                syncFromInfo(info);
                setIsReady(true);
            })
            .catch(() => setIsReady(true));
    }, [isConfigured, isBootstrapped, isAuthenticated, auth0User?.sub, entitlementId]);

    const refresh = async () => {
        const info = await Purchases.getCustomerInfo();
        syncFromInfo(info);
        setIsReady(true);
    };

    const value = useMemo<PurchasesContextValue>(
        () => ({ isPro, isReady, isHydrated, customerInfo, refresh }),
        [isPro, isReady, isHydrated, customerInfo],
    );

    return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
};
