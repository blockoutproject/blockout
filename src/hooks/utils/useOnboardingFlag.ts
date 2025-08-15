// src/hooks/utils/useOnboardingFlag.ts
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const KEY = "onboarding_done"; // remplace par la clé que TU utilises

export function useOnboardingFlag() {
    const [done, setDone] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const v = await SecureStore.getItemAsync(KEY);
            setDone(v === "1");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const markDone = useCallback(async () => {
        await SecureStore.setItemAsync(KEY, "1");
        setDone(true);
    }, []);

    const reset = useCallback(async () => {
        await SecureStore.deleteItemAsync(KEY);
        setDone(false);
    }, []);

    return { done, loading, markDone, reset, reload: load };
}