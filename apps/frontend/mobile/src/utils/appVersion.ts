import * as Application from "expo-application";
import { Platform } from "react-native";
import type { AppStatusDTO } from "@/src/types/AppStatus";

export const CURRENT_APP_VERSION = Application.nativeApplicationVersion ?? "1.0.0";

function parsePart(v: string | undefined): number {
    if (!v) return 0;
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
}

/**
 * Compare deux versions semver "x.y.z".
 * Retourne -1 si a < b, 0 si a == b, 1 si a > b.
 */
export function compareSemver(a: string, b: string): number {
    const pa = a.split(".");
    const pb = b.split(".");
    const len = Math.max(pa.length, pb.length);

    for (let i = 0; i < len; i++) {
        const na = parsePart(pa[i]);
        const nb = parsePart(pb[i]);

        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

/**
 * Retourne true si l'app doit forcer une mise à jour
 * en fonction de la plateforme courante et de appStatus.
 */
export function computeIsUpdateRequired(appStatus?: AppStatusDTO | null): boolean {
    if (!appStatus) return false;

    const minVersion =
        Platform.OS === "ios"
            ? appStatus.minVersionIos
            : appStatus.minVersionAndroid;

    if (!minVersion) return false;

    return compareSemver(CURRENT_APP_VERSION, minVersion) < 0;
}

/**
 * Récupère l’URL vers le store en fonction de la plateforme.
 */
export function getStoreUrl(appStatus?: AppStatusDTO | null): string | null {
    if (!appStatus) return null;

    return Platform.OS === "ios"
        ? appStatus.storeUrlIos ?? null
        : appStatus.storeUrlAndroid ?? null;
}